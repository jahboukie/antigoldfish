import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';
import { IndexingService } from '../services/IndexingService';

function globToRegex(glob: string): RegExp {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<GLOBSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<GLOBSTAR>>/g, '.*');
  return new RegExp('^' + esc + '$');
}

export async function handleWatchCode(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; nudgePro?: (k: string, msg: string) => void; }, opts: any): Promise<void> {
  const root = opts.path || process.cwd();
  const maxChunk = parseInt(opts.maxChunk || '200', 10);
  const debounceMs = parseInt(opts.debounce || '400', 10);
  const include: string[] | undefined = opts.include;
  const exclude: string[] | undefined = opts.exclude;
  const useSymbols = !!opts.symbols;
  if (useSymbols && ctx.nudgePro) {
    ctx.nudgePro('symbols-reindex-file', 'Pro improves symbol chunking and reindex speed. Proceeding with basic symbol mode.');
    ctx.nudgePro('symbols-watch', 'Enhanced symbol chunking and faster diff-aware reindex are Pro features. Proceeding with basic symbol mode.');
  }
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  tracer.plan('watch-code', { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs, explain: tracer.flags.explain });
  tracer.mirror(`smem watch-code --path ${JSON.stringify(root)} --max-chunk ${maxChunk}${useSymbols?' --symbols':''}${include?` --include ${include.join(' ')}`:''}${exclude?` --exclude ${exclude.join(' ')}`:''}${debounceMs!==400?` --debounce ${debounceMs}`:''}${tracer.flags.explain?' --explain':''}`);
  if (tracer.flags.explain) {
    console.log(chalk.gray('Explanation: Watches file changes and re-chunks only changed files; removes stale entries on delete. Emits receipts per batch.'));
  }

  try {
    await ctx.memoryEngine.initialize();
  const { CodeIndexer } = await import('../codeindex/CodeIndexer.js');
  const { TreeSitterIndexer } = await import('../codeindex/TreeSitterIndexer.js');
  const indexer = new CodeIndexer(root);
  const treeSitterIndexer = new TreeSitterIndexer(root);
  const indexing = new IndexingService(ctx.memoryEngine);
    const useTreeSitter = useSymbols && treeSitterIndexer.isAvailable();
    if (useTreeSitter) console.log(chalk.green('🌳 Watch mode using Tree-sitter for precise symbol extraction'));

  const { EmbeddingProvider } = await import('../engine/embeddings/EmbeddingProvider.js');
  const provider = EmbeddingProvider.create(process.cwd());
  try { await provider.init(); } catch {}

    const chokidar = await import('chokidar');

    const defaultExcludes = ['**/node_modules/**','**/.git/**','**/dist/**','**/build/**','**/.next/**','**/.cache/**','**/.securamem/**','**/.antigoldfishmode/**'];
    const includes = (include && include.length) ? include : ['**/*'];
    const excludes = [...defaultExcludes, ...(exclude||[])];
    const shouldIgnore = (relUnix: string): boolean => excludes.some(g => globToRegex(g).test(relUnix.endsWith('/')?relUnix:relUnix));

    const watcher = chokidar.watch(includes, {
      cwd: root,
      ignored: (pth: string) => shouldIgnore(pth.replace(/\\/g,'/')),
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
      persistent: true,
    });

    console.log(chalk.cyan(`👀 Watching ${root} for code changes… Press Ctrl+C to stop.`));

  const pending = new Map<string, 'add'|'change'|'unlink'>();
  const fileDigest = (fullPath: string): string => { return indexing.computeFileSha1(fullPath) || ''; };
    const recentUnlinks = new Map<string, { path: string; at: number }>();
    let timer: NodeJS.Timeout | null = null;

    const flush = async () => {
      if (pending.size === 0) return;
      const batch = Array.from(pending.entries());
      pending.clear();
      let added = 0, updated = 0, removed = 0, errors: string[] = [];
      const context = 'code';
      const processFile = async (rel: string, kind: 'add'|'change'|'unlink') => {
        try {
          const relUnix = rel.replace(/\\/g,'/');
          const full = path.join(root, relUnix);
          const wsRel = path.relative(process.cwd(), full).replace(/\\/g,'/');
          if (kind === 'unlink') {
            const d = fileDigest(full);
            if (d) recentUnlinks.set(d, { path: relUnix, at: Date.now() });
            const n1 = await (ctx.memoryEngine.database as any).deleteCodeByFile?.(relUnix) ?? 0;
            const n2 = await (ctx.memoryEngine.database as any).deleteCodeByFile?.(wsRel) ?? 0;
            const n = n1 + n2;
            removed += n;
            return;
          }
          const digest = fileDigest(full);
          if (kind === 'add' && digest) {
            const recent = recentUnlinks.get(digest);
            if (recent && (Date.now() - recent.at) < 5000) {
              try {
                const oldRel = recent.path;
                const oldWsRel = path.relative(process.cwd(), path.join(root, oldRel)).replace(/\\/g,'/');
                const moved1 = await (ctx.memoryEngine.database as any).updateCodeFilePath?.(oldRel, relUnix);
                const moved2 = await (ctx.memoryEngine.database as any).updateCodeFilePath?.(oldWsRel, wsRel);
                if ((moved1||0) + (moved2||0) > 0) {
                  updated++;
                  recentUnlinks.delete(digest);
                  await (ctx.memoryEngine.database as any).setFileDigest?.(relUnix, digest);
                  return;
                }
              } catch {}
            }
          }
          const prev = await (ctx.memoryEngine.database as any).getFileDigest?.(relUnix) || null;
          if (prev && digest && prev === digest && (kind === 'change' || kind === 'add')) {
            return; // unchanged
          }
          try { await (ctx.memoryEngine.database as any).deleteCodeByFile?.(relUnix); } catch {}
          try { await (ctx.memoryEngine.database as any).deleteCodeByFile?.(wsRel); } catch {}
          const res = await indexing.chunkAndStoreFile(full, { root, useSymbols, maxChunk, provider, treeSitter: useTreeSitter, fileDigest: digest });
          added += res.saved;
          updated++;
          if (digest) await (ctx.memoryEngine.database as any).setFileDigest?.(relUnix, digest);
        } catch (e) {
          errors.push(`${rel}: ${(e as Error).message}`);
        }
      };

      for (const [rel, kind] of batch) {
        await processFile(rel, kind);
      }

      const summary = { files: batch.length, added, updated, removed, errors: errors.length };
      console.log(chalk.green(`🔄 Indexed batch: +${added} ~${updated} -${removed}${errors.length?` (errors=${errors.length})`:''}`));
      try {
        const receipt = tracer.writeReceipt('watch-code', { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs }, summary, true, undefined, { resultSummary: summary });
        tracer.appendJournal({ cmd: 'watch-code', args: { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs }, receipt });
      } catch {}
    };

    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, debounceMs); };

    watcher.on('add', (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'add'); schedule(); });
    watcher.on('change', (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'change'); schedule(); });
    watcher.on('unlink', async (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'unlink'); try { await (ctx.memoryEngine.database as any).deleteFileDigest?.(rel); } catch {} schedule(); });

    const stop = async () => {
      try { if (timer) { clearTimeout(timer); timer = null; } } catch {}
      try { await flush(); } catch {}
      try { await watcher.close(); } catch {}
      await ctx.cleanup();
      console.log(chalk.gray('👋 watch-code stopped.'));
    };

    process.on('SIGINT', async () => { console.log(); console.log(chalk.yellow('Caught interrupt signal (Ctrl+C). Shutting down…')); await stop(); process.exit(0); });
    process.on('SIGTERM', async () => { await stop(); process.exit(0); });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('❌ watch-code failed:'), msg);
    if (/Failed to decrypt database|integrity check failed/i.test(msg)) {
      console.error(chalk.yellow('Tip: run "smem init --force" to reset local DB artifacts if this persists.'));
    }
    await ctx.cleanup();
    process.exit(1);
  }
}
