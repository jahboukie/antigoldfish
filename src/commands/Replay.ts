import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as crypto from 'crypto';
import { Tracer } from '../utils/Trace';
import { Paths } from '../utils/Paths';

interface JournalEntry {
  ts?: string;
  cmd?: string;
  args?: any;
  receipt?: string;
  error?: string;
}

interface ReceiptFile {
  id: string;
  command: string;
  argv: string[];
  cwd: string;
  startTime: string;
  endTime: string;
  params: any;
  results: any;
  success: boolean;
  error?: string;
}

function readJournalEntries(projectRoot: string): JournalEntry[] {
  const journalPath = Paths.journalPath(projectRoot);
  if (!fs.existsSync(journalPath)) return [];
  const text = fs.readFileSync(journalPath, 'utf8');
  const lines = text.trim() ? text.trim().split(/\r?\n/) : [];
  const entries: JournalEntry[] = [];
  for (const l of lines) {
    try { entries.push(JSON.parse(l)); } catch {}
  }
  return entries;
}

function readReceipt(projectRoot: string, idOrPath: string): ReceiptFile | null {
  let filePath = idOrPath;
  if (!idOrPath.endsWith('.json')) {
  filePath = path.join(Paths.receiptsDir(projectRoot), `${idOrPath}.json`);
  }
  if (!fs.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ReceiptFile;
    return data;
  } catch {
    return null;
  }
}

function deriveArgsFromReceipt(rec: ReceiptFile): string[] {
  // rec.argv is the full process argv: [node, cli.js, ...args]
  const args = Array.isArray(rec.argv) ? rec.argv.slice(2) : [];
  return args;
}

function ensureDryRun(args: string[], enforceDryRun: boolean): string[] {
  const hasDry = args.includes('--dry-run');
  if (enforceDryRun && !hasDry) return [...args, '--dry-run'];
  return args;
}

const NON_REPLAYABLE = new Set(['journal', 'replay']);

export async function handleReplay(opts: any, cleanup: () => Promise<void>) {
  const projectRoot = process.cwd();
  const tracer = new Tracer(projectRoot, process.argv);
  try {
    const enforceDryRun = !opts.execute; // safe-by-default
    const mode = opts.id ? 'id' : (opts.range ? 'range' : 'last');
    tracer.plan('replay', { mode, id: opts.id || null, range: opts.range || 1, execute: !!opts.execute });

    const entries = readJournalEntries(projectRoot);
    if (!entries.length) { console.log('Journal is empty. Nothing to replay.'); return; }

    let targets: JournalEntry[] = [];
    if (mode === 'id') {
      const rec = readReceipt(projectRoot, opts.id);
      if (!rec) { console.log(`Receipt not found: ${opts.id}`); return; }
  targets = [{ ts: rec.startTime, cmd: rec.command, args: rec.params, receipt: path.join(Paths.receiptsDir(projectRoot), `${rec.id}.json`) }];
    } else if (mode === 'range') {
      const N = Math.max(1, parseInt(opts.range, 10) || 1);
      const replayables = entries.filter(e => e.cmd && !NON_REPLAYABLE.has(e.cmd));
      targets = replayables.slice(-N);
    } else {
      // last
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (e.cmd && !NON_REPLAYABLE.has(e.cmd)) { targets = [e]; break; }
      }
      if (!targets.length) { console.log('No replayable entries found.'); return; }
    }


    function normalizeMirrorArgs(args: string[]): string[] {
      // Remove duplicated command tokens and redundant script path remnants
      // Heuristic: keep first token as subcommand, drop repeating identical token at pos>0
      const out: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (i > 0 && args[i] === args[0]) continue;
        out.push(args[i]);
      }
      return out;
    }

    // Oldest-first order for ranges
    if (targets.length > 1) targets = targets.slice().sort((a, b) => (a.ts! < b.ts! ? -1 : 1));

    // Integrity digest over replay batch (ids from receipts if available)
    const ids = targets.map(t => (t.receipt ? path.basename(t.receipt, '.json') : null)).filter(Boolean) as string[];
    const digest = crypto.createHash('sha256').update(JSON.stringify(ids)).digest('hex');

    // Build mirror preview
    console.log('🪞 Mirror (replay) plan:');
    for (const t of targets) {
      const rec = t.receipt ? readReceipt(projectRoot, t.receipt) : (t.ts ? null : null);
      let args: string[] | null = null;
      if (rec) args = deriveArgsFromReceipt(rec);
      const norm = args ? normalizeMirrorArgs(args) : null;
      if (norm) {
        const hasDry = norm.includes('--dry-run');
        const preview = hasDry || !enforceDryRun ? norm : [...norm, '--dry-run'];
  console.log(`   smem ${preview.join(' ')}`);
      } else {
  console.log(`   smem ${t.cmd}${enforceDryRun ? ' --dry-run' : ''}`);
      }
    }

    if (tracer.flags.explain) {

    // Integrity digest over replay batch (ids from receipts if available)
    const ids = targets.map(t => (t.receipt ? path.basename(t.receipt, '.json') : null)).filter(Boolean) as string[];
    const digest = crypto.createHash('sha256').update(JSON.stringify(ids)).digest('hex');

      console.log('Explanation: replays journaled commands in order. Default is dry-run; pass --execute to actually run.');
    }

    const nodeBin = process.argv[0];
    const cliEntry = process.argv[1];
    const results: Array<{ cmd: string; exitCode: number | null }> = [];

    for (const t of targets) {
      // Prefer receipt argv for faithful replay
      let rec: ReceiptFile | null = null;
      if (t.receipt) rec = readReceipt(projectRoot, t.receipt);
      if (!rec) {
        if (!t.receipt) {
          // Try to find the last receipt for the same cmd by scanning from end
          for (let i = entries.length - 1; i >= 0; i--) {
            const e = entries[i];
            if (e.cmd === t.cmd && e.receipt) { rec = readReceipt(projectRoot, e.receipt); break; }
          }
        }
      }
      if (!rec) { console.log(`Skipping ${t.cmd}: no receipt argv available`); continue; }
      if (!rec.argv || rec.argv.length < 2) { console.log(`Skipping ${t.cmd}: malformed argv in receipt`); continue; }

      const args = deriveArgsFromReceipt(rec);
      // Skip non-replayable commands
      const subcmd = args[0];
      if (NON_REPLAYABLE.has(subcmd)) { console.log(`Skipping non-replayable command: ${subcmd}`); continue; }

      // Enforce dry-run unless --execute, and de-duplicate flags
      let finalArgs = ensureDryRun(args, enforceDryRun);
      const dedupe = (arr: string[]) => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const a of arr) { if (!seen.has(a)) { seen.add(a); out.push(a); } }
        return out;
      };

      // Pass through tracing flags from wrapper if desired
      if (tracer.flags.trace && !finalArgs.includes('--trace')) finalArgs.push('--trace');
      if (tracer.flags.json && !finalArgs.includes('--json')) finalArgs.push('--json');
      if (tracer.flags.explain && !finalArgs.includes('--explain')) finalArgs.push('--explain');
      finalArgs = dedupe(finalArgs);

      // Spawn child
      await new Promise<void>((resolve) => {
        const child = spawn(nodeBin, [cliEntry, ...finalArgs], { stdio: 'inherit', cwd: projectRoot, shell: false });
        child.on('exit', (code) => {
          results.push({ cmd: subcmd, exitCode: code });
          resolve();
        });
      });

    // Summarize outcomes (per-step summary unless summary-only)
    if (!opts?.summaryOnly) {
      const succeeded = results.filter(r => r.exitCode === 0).length;
      const failed = results.length - succeeded;
      console.log(`📋 Replay summary: ${succeeded}/${results.length} succeeded, ${failed} failed`);
    }

    }

    const finalSucceeded = results.filter(r => r.exitCode === 0).length;
    const finalFailed = results.length - finalSucceeded;
    console.log(`🧾 Final replay summary: ${finalSucceeded}/${results.length} succeeded, ${finalFailed} failed`);


    const receipt = tracer.writeReceipt('replay', { mode, enforceDryRun, count: targets.length, ids, digest }, { results }, true);
    tracer.appendJournal({ cmd: 'replay', args: { mode, enforceDryRun, count: targets.length, ids, digest }, receipt });
  } catch (e) {
    const tracer = new Tracer(process.cwd(), process.argv);
    const receipt = tracer.writeReceipt('replay', {}, {}, false, (e as Error).message);
    tracer.appendJournal({ cmd: 'replay', error: (e as Error).message, receipt });
    console.error('replay error:', (e as Error).message);
  } finally {
    await cleanup();
  }
}

