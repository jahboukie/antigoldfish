import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
  params: any;
  resultSummary?: any; // condensed summary for quick inspection
  results: any;
  success: boolean;
  exitCode?: number;
  error?: string;
  digests?: { argsSha256: string; [k: string]: string };
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
    const dir = path.join(this.projectRoot, '.antigoldfishmode');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const receipts = path.join(dir, 'receipts');
    if (!fs.existsSync(receipts)) fs.mkdirSync(receipts, { recursive: true });
  }

  private journalPath(): string {
    return path.join(this.projectRoot, '.antigoldfishmode', 'journal.jsonl');
  }
  private receiptsDir(): string {
    return path.join(this.projectRoot, '.antigoldfishmode', 'receipts');
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

  writeReceipt(command: string, params: any, results: any, success: boolean, error?: string, extra?: { resultSummary?: any; exitCode?: number; digests?: Record<string,string>; hybrid?: { backend: string; fusionWeights: { bm25: number; cosine: number }; rerankN: number } }): string {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
    const argsSha256 = crypto.createHash('sha256').update(JSON.stringify({ argv: this.argv, params })).digest('hex');
    const receipt: ReceiptV1 = {
      schema: 'v1',
      version: require('../../package.json').version || '0.0.0',
      id,
      command,
      argv: this.argv,
      cwd: process.cwd(),
      startTime: this.startISO,
      endTime: new Date().toISOString(),
      params,
      resultSummary: extra?.resultSummary,
      results,
      success,
      exitCode: extra?.exitCode,
      error,
      digests: { argsSha256, ...(extra?.digests || {}) }
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

