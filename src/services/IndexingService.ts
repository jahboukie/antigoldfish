import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MemoryEngine } from '../MemoryEngine';

export class IndexingService {
  constructor(private memoryEngine: MemoryEngine) {}

  // --- Digest helpers (kept public for callers that manage diff caches) ---
  computeFileSha256(absPath: string): string | undefined {
    try { return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex'); } catch { return undefined; }
  }
  computeFileSha1(absPath: string): string | undefined {
    try { return crypto.createHash('sha1').update(fs.readFileSync(absPath)).digest('hex'); } catch { return undefined; }
  }

  /**
   * Chunk a single file and store chunks into the database with optional vectors.
   * - Deletes existing entries for this file (both project-rel and workspace-rel) before inserting.
   * - If options.fileDigest is provided, it will be included in chunk metadata (for audit/provenance).
   * - If options.treeSitter is true and available, uses Tree-sitter symbol chunking.
   */
  async chunkAndStoreFile(absPath: string, options: {
    root: string;
    useSymbols: boolean;
    maxChunk?: number;
    provider?: any; // EmbeddingProvider-like (optional)
    treeSitter?: boolean;
    fileDigest?: string; // sha256 caller-computed (optional)
  }): Promise<{ saved: number; relUnix: string; strategy: 'lines'|'symbols'|'treesitter-ast'; }> {
    const root = options.root;
    const useSymbols = !!options.useSymbols;
    const maxChunk = options.maxChunk ?? 200;

    const relUnix = path.relative(root, absPath).replace(/\\/g, '/');
    const wsRel = path.relative(process.cwd(), absPath).replace(/\\/g, '/');

    // wipe any existing code entries for this file (both project-relative and workspace-relative)
    try { await (this.memoryEngine.database as any).deleteCodeByFile?.(relUnix); } catch {}
    try { await (this.memoryEngine.database as any).deleteCodeByFile?.(wsRel); } catch {}

    const { CodeIndexer } = await import('../codeindex/CodeIndexer.js');
    const { SymbolIndexer } = await import('../codeindex/SymbolIndexer.js');
    const idx = new CodeIndexer(root);
    const sym = new SymbolIndexer(root);

    // Optional Tree-sitter
    let treeSitterAvailable = false;
    let tree: any = null;
    if (options.treeSitter && useSymbols) {
      try {
        const { TreeSitterIndexer } = await import('../codeindex/TreeSitterIndexer.js');
        tree = new TreeSitterIndexer(root);
        treeSitterAvailable = !!tree.isAvailable();
      } catch { treeSitterAvailable = false; }
    }

    const fromTree = (f: string) => tree.chunkFile(f).map((c: any) => ({
      text: c.text,
      meta: {
        file: c.meta.file,
        language: c.meta.language,
        lineStart: c.meta.lineStart,
        lineEnd: c.meta.lineEnd,
        symbol: c.meta.symbolName,
        symbolType: c.meta.symbolType,
        tags: ['symbol', c.meta.symbolType || 'unknown']
      }
    }));

    const chunks: Array<{ text: string; meta: any }>
      = useSymbols
        ? (treeSitterAvailable ? fromTree(absPath) : sym.chunkBySymbols(absPath))
        : idx.chunkFile(absPath, maxChunk).map((c: { text: string; meta: any }) => ({ text: c.text, meta: c.meta }));

    // Use provided provider if any, otherwise try to create one (best-effort)
    let provider = options.provider;
    if (!provider) {
      try { const { EmbeddingProvider } = await import('../engine/embeddings/EmbeddingProvider.js'); provider = EmbeddingProvider.create(process.cwd()); await provider.init(); } catch { provider = null; }
    }

    let saved = 0;
    const tagsBase = (meta: any) => ['code', meta?.language || 'unknown', useSymbols ? 'symbol' : undefined].filter(Boolean) as string[];
    for (const chunk of chunks) {
      const metadata = { ...chunk.meta, contentSha: crypto.createHash('sha256').update(chunk.text).digest('hex'), fileDigest: options.fileDigest, indexStrategy: useSymbols ? (treeSitterAvailable ? 'treesitter-ast' : 'heuristic-symbols') : 'line-chunks' };
      const id = await this.memoryEngine.database.storeMemory(
        chunk.text,
        'code',
        'code',
        tagsBase(chunk.meta),
        metadata,
      );
      if (provider && (provider as any).getInfo) {
        try {
          const vec = await provider.embed(chunk.text);
          await this.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions);
        } catch {}
      }
      saved++;
    }

    return { saved, relUnix, strategy: useSymbols ? (treeSitterAvailable ? 'treesitter-ast' : 'symbols') : 'lines' };
  }

  async reindexSingleFile(absPath: string, options: { root: string; useSymbols: boolean; maxChunk?: number }): Promise<{ saved: number; relUnix: string; }> {
    const root = options.root;
    const useSymbols = !!options.useSymbols;
    const maxChunk = options.maxChunk ?? 200;

    const relUnix = path.relative(root, absPath).replace(/\\/g, '/');
    const wsRel = path.relative(process.cwd(), absPath).replace(/\\/g, '/');

    // wipe any existing code entries for this file (both project-relative and workspace-relative)
    try { await (this.memoryEngine.database as any).deleteCodeByFile?.(relUnix); } catch {}
    try { await (this.memoryEngine.database as any).deleteCodeByFile?.(wsRel); } catch {}

  // Delegate to unified path
  const { EmbeddingProvider } = await import('../engine/embeddings/EmbeddingProvider.js');
  const provider = EmbeddingProvider.create(process.cwd());
  try { await provider.init(); } catch {}
  const { saved } = await this.chunkAndStoreFile(absPath, { root, useSymbols, maxChunk, provider, treeSitter: true });

    // Update digest for this file
    try {
      const dig = this.computeFileSha1(absPath);
      if (dig) await (this.memoryEngine.database as any).setFileDigest?.(relUnix, dig);
    } catch {}

    return { saved, relUnix };
  }

  async reindexFolder(absFolder: string, options: { root: string; include?: string[]; exclude?: string[]; useSymbols: boolean; maxChunk: number; }): Promise<{ files: number; added: number; errors: number; }> {
    const root = options.root;
    const include = options.include;
    const exclude = options.exclude;
    const useSymbols = !!options.useSymbols;
    const maxChunk = options.maxChunk;

  const { CodeIndexer } = await import('../codeindex/CodeIndexer.js');
  const idx = new CodeIndexer(absFolder);
  const files = idx.listFiles({ include, exclude, maxChunkLines: maxChunk });
    let added = 0, errors = 0;
  const { EmbeddingProvider } = await import('../engine/embeddings/EmbeddingProvider.js');
  const provider = EmbeddingProvider.create(process.cwd());
  try { await provider.init(); } catch {}

    for (const rel of files) {
      const full = path.join(absFolder, rel);
      const projectRel = path.relative(root, full).replace(/\\/g, '/');
      try {
        // wipe existing entries for this file
        const res = await this.chunkAndStoreFile(full, { root, useSymbols, maxChunk, provider, treeSitter: true });
        added += res.saved;
        // refresh digest for this file
        try {
          const dig = this.computeFileSha1(full);
          if (dig) await (this.memoryEngine.database as any).setFileDigest?.(projectRel, dig);
        } catch {}
      } catch (e) {
        errors++;
        // keep going; count errors
      }
    }

    return { files: files.length, added, errors };
  }
}
