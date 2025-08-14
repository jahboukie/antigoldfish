import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';
import { IndexingService } from '../services/IndexingService';

export async function handleIndexCode(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; proEnabled?: boolean; nudgePro?: (k: string, msg: string) => void; }, opts: any): Promise<void> {
  const root = opts.path || process.cwd();
  const maxChunk = parseInt(opts.maxChunk || '200', 10);
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    tracer.plan('index-code', { root, maxChunk, symbols: !!opts.symbols, diff: !!opts.diff, explain: tracer.flags.explain });
    tracer.mirror(`smem index-code --path ${JSON.stringify(root)} --max-chunk ${maxChunk}${opts.symbols?' --symbols':''}${opts.diff?' --diff':''}${tracer.flags.explain?' --explain':''}`);
    if (tracer.flags.explain) {
      console.log(chalk.gray(`Explanation: Walk files (include/exclude), ${opts.symbols?'chunk by symbols (functions/classes/interfaces/enums)':'chunk by lines'}, store as type=code with metadata (file, language, line ranges).${opts.diff?' Diff: skip files whose contentSha already present.':''}`));
    }

  await ctx.memoryEngine.initialize();
  const indexing = new IndexingService(ctx.memoryEngine);
  const { CodeIndexer } = await import('../codeindex/CodeIndexer.js');
  const indexer = new CodeIndexer(root);
  const { TreeSitterIndexer } = await import('../codeindex/TreeSitterIndexer.js');
  const treeSitterIndexer = new TreeSitterIndexer(root);

    const include: string[] | undefined = opts.include;
    const exclude: string[] | undefined = opts.exclude;

    let saved = 0;
    const pending: Promise<any>[] = [];
    const context = 'code';

  const { EmbeddingProvider } = await import('../engine/embeddings/EmbeddingProvider.js');
  const provider = EmbeddingProvider.create(process.cwd());
  await provider.init().catch((e: unknown) => {
      console.log(chalk.yellow('⚠️ Embedding provider init failed. Continuing without vectors.'));
      if (tracer.flags.trace) console.log(String(e));
      return undefined;
    });

    const embedAndStore = async (text: string, tags: string[], metadata: any) => {
      const id = await ctx.memoryEngine.database.storeMemory(text, context, 'code', tags, metadata);
      if (provider && (provider as any).getInfo) {
        try {
          const vec = await provider.embed(text);
          await ctx.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions);
        } catch (e) {
          if (tracer.flags.trace) console.log('Vector upsert skipped:', String(e));
        }
      }
      saved++;
    };

    // Pre-list files once (applies to both symbol and line modes)
    const fileList = new (await import('../codeindex/CodeIndexer.js')).CodeIndexer(root).listFiles({ include, exclude, maxChunkLines: maxChunk });

    // Load / build file digest cache (persisted) if --diff
    let existingFileDigest: Map<string,string> | null = null;
    let fileDigestCachePath: string | null = null;
    const prefDir = path.join(process.cwd(), '.securamem');
    const legacyDir = path.join(process.cwd(), '.antigoldfishmode');
    if (opts.diff) {
      existingFileDigest = new Map();
      try {
        const preferred = path.join(prefDir, 'file-digests.json');
        const legacy = path.join(legacyDir, 'file-digests.json');
        fileDigestCachePath = fs.existsSync(preferred) ? preferred : (fs.existsSync(legacy) ? legacy : preferred);
        if (fileDigestCachePath && fs.existsSync(fileDigestCachePath)) {
          const raw = JSON.parse(fs.readFileSync(fileDigestCachePath, 'utf8'));
          Object.keys(raw || {}).forEach(f => existingFileDigest!.set(f, raw[f]));
        }
      } catch {}
    } else {
      existingFileDigest = new Map();
      try {
        fileDigestCachePath = path.join(prefDir, 'file-digests.json');
      } catch {}
    }

    if (opts.symbols) {
      // Check if Tree-sitter is available
      const useTreeSitter = treeSitterIndexer.isAvailable();
      if (!useTreeSitter && ctx.nudgePro && ctx.proEnabled === false) {
        ctx.nudgePro('symbols', 'Enhanced symbol chunking (Tree-sitter pack, smarter heuristics) is available with Pro. Proceeding with basic symbol indexing.');
      } else if (useTreeSitter) {
        console.log(chalk.green('🌳 Using Tree-sitter for precise AST-based symbol extraction'));
      }

      for (const file of fileList) {
        const full = require('path').join(root, file);
        const fileSha = indexing.computeFileSha256(full);
        if (existingFileDigest && fileSha && existingFileDigest.get(file) === fileSha) continue; // unchanged file (diff mode)
        if (!tracer.flags.dryRun) {
          const { saved: s } = await indexing.chunkAndStoreFile(full, { root, useSymbols: true, maxChunk, provider, treeSitter: true, fileDigest: fileSha });
          saved += s;
        }
        if (existingFileDigest && fileSha) existingFileDigest.set(file, fileSha); // update cache
      }
    } else {
      // Need file digests: build map file->fileDigest first
      const fileDigestMap = new Map<string,string>();
      for (const f of fileList) {
        try { const d = indexing.computeFileSha256(path.join(root, f)); if (d) fileDigestMap.set(f, d); } catch {}
      }
      indexer.indexFiles({ maxChunkLines: maxChunk, context, include, exclude }, (chunk: { text: string; meta: { language?: string } }) => {
        if (tracer.flags.dryRun) { return; }
        const rel = (chunk as any).meta?.file;
        if (existingFileDigest && rel && existingFileDigest.get(rel) === fileDigestMap.get(rel)) return; // unchanged file in diff mode
        const tags = ['code', chunk.meta.language || 'unknown'];
        pending.push((async () => {
          const tmpFile = path.join(root, rel);
          const { saved: s } = await indexing.chunkAndStoreFile(tmpFile, { root, useSymbols: false, maxChunk, provider, treeSitter: false, fileDigest: rel ? fileDigestMap.get(rel) : undefined });
          saved += s;
        })());
        if (existingFileDigest && rel) existingFileDigest.set(rel, fileDigestMap.get(rel)!);
      });
    }

    await Promise.all(pending);

    const listForDigest = fileList; // already computed
    const digest = crypto.createHash('sha256').update(JSON.stringify(listForDigest)).digest('hex');

    const result = { saved, root, digest, fileCount: listForDigest.length, diff: !!opts.diff };
    if (tracer.flags.json) {
      console.log(JSON.stringify(result, null, 2));

      if (tracer.flags.explain) {
        const { CodeIndexer } = await import('../codeindex/CodeIndexer.js');
        const files = new CodeIndexer(root).listFiles({ include, exclude, maxChunkLines: maxChunk });
        console.log(chalk.gray(`Explain: include=${JSON.stringify(include||['**/*'])} exclude=${JSON.stringify(exclude||['**/node_modules/**', '**/.git/**', '**/dist/**'])}`));
        console.log(chalk.gray(`Explain: files considered=${files.length}`));
      }

    } else {
      console.log(`✅ Indexed code from ${root}. Saved chunks: ${saved}${opts.diff?' (diff)':''}`);
      console.log(chalk.gray(`   Files considered: ${listForDigest.length}, digest: ${digest.slice(0,8)}…${opts.diff?' (skipped unchanged)':''}`));
      if (opts.diff && saved === 0) {
        console.log(chalk.gray('   All files unchanged (nothing new to index).'));
      }
    }

    const receipt = tracer.writeReceipt('index-code', { root, maxChunk, include, exclude, dryRun: tracer.flags.dryRun, diff: !!opts.diff }, result, true, undefined, { resultSummary: { saved }, digests: { fileListDigest: digest } });
    tracer.appendJournal({ cmd: 'index-code', args: { root, maxChunk, include, exclude, dryRun: tracer.flags.dryRun }, receipt });

    // Persist updated file digest cache if diff
    if (fileDigestCachePath && existingFileDigest) {
      try {
        fs.mkdirSync(path.dirname(fileDigestCachePath), { recursive: true });
        const obj: Record<string,string> = {};
        existingFileDigest.forEach((v,k) => { obj[k] = v; });
        const preferred = path.join(prefDir, 'file-digests.json');
        fs.writeFileSync(preferred, JSON.stringify(obj, null, 2));
        if (fileDigestCachePath !== preferred) {
          try { fs.writeFileSync(fileDigestCachePath, JSON.stringify(obj, null, 2)); } catch {}
        }
      } catch {}
    }
  } catch (error) {
    const receipt = tracer.writeReceipt('index-code', { root, maxChunk }, {}, false, (error as Error).message);
    tracer.appendJournal({ cmd: 'index-code', error: (error as Error).message, receipt });
    console.error(chalk.red('❌ Code indexing failed:'), error instanceof Error ? error.message : error);
  } finally {
    await ctx.cleanup();
  }
}
