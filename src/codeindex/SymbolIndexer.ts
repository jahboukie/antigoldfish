import * as fs from 'fs';
import * as path from 'path';
import { CodeChunkMetadata } from './CodeIndexer';

export interface SymbolChunk { text: string; meta: CodeChunkMetadata & { symbol?: string; symbolType?: string } }

function detectLanguage(file: string): string | undefined {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.go': 'go'
  };
  return map[ext];
}

export class SymbolIndexer {
  constructor(private projectRoot: string) {}

  public chunkBySymbols(fullPath: string): SymbolChunk[] {
    const lang = detectLanguage(fullPath);
    const text = fs.readFileSync(fullPath, 'utf8');
    const lines = text.split(/\r?\n/);

    const chunks: SymbolChunk[] = [];

    if (lang === 'typescript' || lang === 'javascript') {
      // Heuristics: function foo( | class Foo | const foo = (|export default function
      const fnRe = /^(export\s+)?(async\s+)?function\s+([A-Za-z0-9_]+)/;
      const classRe = /^(export\s+)?class\s+([A-Za-z0-9_]+)/;
      const arrowRe = /^(export\s+)?(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m;
        if ((m = line.match(fnRe))) {
          const name = m[3];
          const { end } = findBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'function', lines, i, end));
          i = end - 1; continue;
        }
        if ((m = line.match(classRe))) {
          const name = m[2];
          const { end } = findBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'class', lines, i, end));
          i = end - 1; continue;
        }
        if ((m = line.match(arrowRe))) {
          const name = m[3];
          const { end } = findBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'function', lines, i, end));
          i = end - 1; continue;
        }
      }
    } else if (lang === 'python') {
      // def foo(: start until next def/class at same or lower indent
      const defRe = /^\s*def\s+([A-Za-z0-9_]+)\s*\(/;
      const classRe = /^\s*class\s+([A-Za-z0-9_]+)\s*\(/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m;
        if ((m = line.match(defRe))) {
          const name = m[1];
          const { end } = findPythonBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'function', lines, i, end));
          i = end - 1; continue;
        }
        if ((m = line.match(classRe))) {
          const name = m[1];
          const { end } = findPythonBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'class', lines, i, end));
          i = end - 1; continue;
        }
      }
    } else if (lang === 'go') {
      // func Name( ... ) {  or type Name struct { ... }
      const funcRe = /^func\s+([A-Za-z0-9_]+)/;
      const typeRe = /^type\s+([A-Za-z0-9_]+)\s+struct\s*\{/;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m;
        if ((m = line.match(funcRe))) {
          const name = m[1];
          const { end } = findBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'function', lines, i, end));
          i = end - 1; continue;
        }
        if ((m = line.match(typeRe))) {
          const name = m[1];
          const { end } = findBlockEnd(lines, i);
          chunks.push(makeChunk(fullPath, lang!, name, 'struct', lines, i, end));
          i = end - 1; continue;
        }
      }
    }

    // Fallback: whole file as one chunk if nothing detected
    if (chunks.length === 0) {
      chunks.push(makeChunk(fullPath, lang || 'unknown', path.basename(fullPath), 'file', lines, 0, lines.length));
    }

    return chunks;
  }
}

function findBlockEnd(lines: string[], start: number): { end: number } {
  // Naive brace counting; good enough for TS/JS/Go in many cases
  let depth = 0;
  let seenBrace = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') { depth++; seenBrace = true; }
      else if (ch === '}') { depth--; if (depth <= 0 && seenBrace) return { end: i + 1 }; }
    }
  }
  return { end: Math.min(lines.length, start + 200) };
}

function findPythonBlockEnd(lines: string[], start: number): { end: number } {
  const baseIndent = leadingSpaces(lines[start]);
  for (let i = start + 1; i < lines.length; i++) {
    const s = lines[i];
    if (/^\s*$/.test(s)) continue;
    const ind = leadingSpaces(s);
    if (ind <= baseIndent) return { end: i };
  }
  return { end: lines.length };
}

function leadingSpaces(s: string): number {
  const m = s.match(/^\s*/);
  return m ? m[0].length : 0;
}

function makeChunk(fullPath: string, lang: string, name: string, symbolType: string, lines: string[], start: number, end: number): SymbolChunk {
  const text = lines.slice(start, end).join('\n');
  const meta: CodeChunkMetadata & { symbol?: string; symbolType?: string } = {
    file: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
    language: lang,
    lineStart: start + 1,
    lineEnd: end,
    symbol: name,
    tags: ['symbol', symbolType]
  };
  return { text, meta };
}

