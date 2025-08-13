import * as fs from 'fs';
import * as path from 'path';

export interface CodeChunkMetadata {
  file: string;
  language?: string;
  lineStart: number;
  lineEnd: number;
  symbol?: string;
  tags?: string[];
}

export interface IndexOptions {
  include?: string[]; // glob-like (simple ** and * only)
  exclude?: string[];
  maxChunkLines?: number; // simple line-based chunking for now
  context?: string; // memory context label
}

export class CodeIndexer {
  constructor(private projectRoot: string) {}

  private shouldExclude(rel: string, patterns: string[]): boolean {
    // very small globbing: ** for any dirs; * for filename part
    // convert to Regex conservatively
    return patterns.some((p) => {
      const re = new RegExp('^' + p
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') + '$');
      return re.test(rel.replace(/\\/g, '/'));
    });
  }

  private detectLanguage(file: string): string | undefined {
    const ext = path.extname(file).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
      '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java', '.rb': 'ruby',
      '.cs': 'csharp', '.php': 'php', '.cpp': 'cpp', '.c': 'c', '.h': 'c-header',
      '.md': 'markdown'
    };
    return map[ext];
  }

  private* walkFiles(root: string, opts: IndexOptions): Generator<string> {
    const include = opts.include && opts.include.length ? opts.include : ['**/*'];
    const exclude = opts.exclude && opts.exclude.length ? opts.exclude : [
      '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.cache/**'
    ];

    const stack = [root];
    while (stack.length) {
      const current = stack.pop()!;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(current, e.name);
        const rel = path.relative(root, full);
        const relUnix = rel.replace(/\\/g, '/');
        if (e.isDirectory()) {
          if (this.shouldExclude(relUnix + '/', exclude)) continue;
          stack.push(full);
        } else if (e.isFile()) {
          // must match include and not excluded
          const included = include.some(p => {
            const pattern = p.replace(/[.+^${}()|[\]\\]/g, '\\$&')
              .replace(/\*\*/g, '.*')
              .replace(/\*/g, '[^/]*');
            const re = new RegExp('^' + pattern + '$');
            if (re.test(relUnix)) return true;
            // Special case: pattern like **/* should also match root-level files (no slash)
            if (p === '**/*' && !relUnix.includes('/')) return true;
            return false;
          });
          if (!included) continue;
          if (this.shouldExclude(relUnix, exclude)) continue;
          if (relUnix.endsWith('.lock') || relUnix.endsWith('.min.js')) continue;
          yield full;
        }
      }
    }
  }

  public listFiles(opts: IndexOptions): string[] {
    const files: string[] = [];
    for (const file of this.walkFiles(this.projectRoot, opts)) files.push(file);
    return files.map(f => path.relative(this.projectRoot, f).replace(/\\/g, '/')).sort();
  }

  chunkFile(fullPath: string, maxChunkLines: number): Array<{ text: string; meta: CodeChunkMetadata }> {
    const text = fs.readFileSync(fullPath, 'utf8');
    const lines = text.split(/\r?\n/);
    const chunks: Array<{ text: string; meta: CodeChunkMetadata }> = [];
    for (let i = 0; i < lines.length; i += maxChunkLines) {
      const slice = lines.slice(i, Math.min(i + maxChunkLines, lines.length));
      const meta: CodeChunkMetadata = {
        file: path.relative(this.projectRoot, fullPath).replace(/\\/g, '/'),
        language: this.detectLanguage(fullPath),
        lineStart: i + 1,
        lineEnd: Math.min(i + maxChunkLines, lines.length),
      };
      chunks.push({ text: slice.join('\n'), meta });
    }
    return chunks;
  }

  indexFiles(opts: IndexOptions, onChunk: (chunk: { text: string; meta: CodeChunkMetadata }) => Promise<void> | void): number {
    let count = 0;
    const maxLines = opts.maxChunkLines ?? 200;
    for (const file of this.walkFiles(this.projectRoot, opts)) {
      const chunks = this.chunkFile(file, maxLines);
      for (const chunk of chunks) {
        onChunk(chunk);
        count++;
      }
    }
    return count;
  }
}

