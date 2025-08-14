import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

export interface TraceFlags {
  trace: boolean;
  dryRun: boolean;
  json: boolean;
  explain: boolean;
}

export interface ReceiptV1 {
  schema: 'v1';
  version: string; // CLI/package version
  id: string;
  command: string;
  argv: string[];
  cwd: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  params: any;
  resultSummary?: any; // condensed summary for quick inspection
  results: any;
  success: boolean;
  exitCode?: number;
  error?: string;
  digests?: { argsSha256: string; [k: string]: string };
  extras?: any;
}

export class Tracer {
  readonly projectRoot: string;
  readonly flags: TraceFlags;
  readonly argv: string[];
  private startISO: string;

  constructor(projectRoot: string, argv: string[], flags?: Partial<TraceFlags>) {
    this.projectRoot = projectRoot;
    this.argv = argv;
    this.flags = {
      trace: !!flags?.trace || argv.includes('--trace'),
      dryRun: !!flags?.dryRun || argv.includes('--dry-run'),
      json: !!flags?.json || argv.includes('--json'),
      explain: !!flags?.explain || argv.includes('--explain'),
    };
    this.startISO = new Date().toISOString();
    this.ensureDirs();
  }

  static create(projectRoot: string): Tracer {
    return new Tracer(projectRoot, process.argv);
  }

  private ensureDirs() {
  const dir = path.join(this.projectRoot, '.securamem');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const receipts = path.join(dir, 'receipts');
    if (!fs.existsSync(receipts)) fs.mkdirSync(receipts, { recursive: true });
  }

  private journalPath(): string {
  return path.join(this.projectRoot, '.securamem', 'journal.jsonl');
  }
  private receiptsDir(): string {
  return path.join(this.projectRoot, '.securamem', 'receipts');
  }

  plan(title: string, details: Record<string, any>) {
    if (this.flags.trace || this.flags.explain) {
      console.log('📝 Plan:', title);
      Object.entries(details).forEach(([k, v]) => console.log(`   ${k}: ${JSON.stringify(v)}`));
    }
  }

  mirror(commandLine: string) {
    if (this.flags.trace || this.flags.explain) {
      console.log('🪞 Mirror this command:');
      console.log(`   ${commandLine}`);
    }
  }

  writeReceipt(command: string, params: any, results: any, success: boolean, error?: string, extra?: { resultSummary?: any; exitCode?: number; digests?: Record<string,string>; hybrid?: { backend: string; fusionWeights: { bm25: number; cosine: number }; rerankN: number }; verification?: any }): string {
    // Redaction / path escape guard: scrub any absolute or outside-root paths from params/results before persisting
    const redactions: { outsideRoot: Set<string> } = { outsideRoot: new Set() };
    const projectRootNorm = path.resolve(this.projectRoot);
    const isWithinRoot = (p: string): boolean => {
      try {
        const rp = path.resolve(p);
        return rp.startsWith(projectRootNorm + path.sep) || rp === projectRootNorm;
      } catch { return false; }
    };
    const looksPathLike = (v: string): boolean => /[\\/]/.test(v) && (path.isAbsolute(v) || v.includes('..'+path.sep) || /^[A-Za-z]:\\/.test(v));
    const REDACT = '<redacted:outside-root>';
    const seen = new WeakSet();
    const sanitize = (val: any): any => {
      if (val == null) return val;
      if (typeof val === 'string') {
        if (looksPathLike(val)) {
          try {
            const abs = path.isAbsolute(val) ? val : path.resolve(this.projectRoot, val);
            if (!isWithinRoot(abs)) {
              redactions.outsideRoot.add(val);
              return REDACT;
            }
          } catch { /* ignore */ }
        }
        return val;
      }
      if (typeof val === 'object') {
        if (seen.has(val)) return val; seen.add(val);
        if (Array.isArray(val)) return val.map(sanitize);
        const out: any = {};
        for (const [k,v] of Object.entries(val)) out[k] = sanitize(v);
        return out;
      }
      return val;
    };
    const scrubbedParams = sanitize(params);
    const scrubbedResults = sanitize(results);

    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const argsSha256 = crypto.createHash('sha256').update(JSON.stringify({ argv: this.argv, params })).digest('hex');
    const endISO = new Date().toISOString();
    let durationMs = 0;
    try { durationMs = Math.max(0, new Date(endISO).getTime() - new Date(this.startISO).getTime()); } catch {}
    const receipt: ReceiptV1 = {
      schema: 'v1',
      version: require('../../package.json').version || '0.0.0',
      id,
      command,
      argv: this.argv,
      cwd: process.cwd(),
      startTime: this.startISO,
      endTime: endISO,
      durationMs,
      params: scrubbedParams,
      resultSummary: extra?.resultSummary,
      results: scrubbedResults,
      success,
      exitCode: extra?.exitCode,
      error,
      digests: { argsSha256, ...(extra?.digests || {}) },
      extras: (() => {
        const base: any = {};
  if (extra?.hybrid) base.hybrid = extra.hybrid;
  if (extra?.verification) base.verification = extra.verification;
        if (redactions.outsideRoot.size) {
          base.redactions = {
            outsideRoot: {
              count: redactions.outsideRoot.size,
              examples: Array.from(redactions.outsideRoot).slice(0,5)
            }
          };
        }
        return Object.keys(base).length ? base : undefined;
      })()
    };
    const filePath = path.join(this.receiptsDir(), `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(receipt, null, 2));
    if (this.flags.trace) {
      console.log('🧾 Receipt saved:', filePath);
    }
    return filePath;
  }

  appendJournal(entry: any) {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
    fs.appendFileSync(this.journalPath(), line);
  }
}

