import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';

export async function handleGC(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; }, opts: any): Promise<void> {
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  const root = process.cwd();
  try {
    await ctx.memoryEngine.initialize();
    let prunedVectors = 0;
    let staleDigestsRemoved = 0;
    let vacuumed = false;

    if (opts.pruneVectors) {
      try { prunedVectors = await (ctx.memoryEngine.database as any).pruneOrphanVectors?.(); } catch {}
    }

    if (opts.dropStaleDigests) {
      try {
        const rows = await (ctx.memoryEngine.database as any).listAllFileDigests?.();
        if (rows && rows.length) {
          for (const r of rows) {
            const full = path.join(root, r.file.replace(/\\/g,'/'));
            if (!fs.existsSync(full)) {
              try { await (ctx.memoryEngine.database as any).deleteFileDigest?.(r.file); staleDigestsRemoved++; } catch {}
            }
          }
        }
      } catch {}
    }

    if (opts.vacuum) {
      try { await (ctx.memoryEngine.database as any).vacuum?.(); vacuumed = true; } catch {}
    }

    console.log(chalk.green(`🧹 GC complete: orphanVectors=${prunedVectors}, staleDigests=${staleDigestsRemoved}${vacuumed?', vacuumed':''}`));
    const receipt = tracer.writeReceipt('gc', { pruneVectors: !!opts.pruneVectors, dropStaleDigests: !!opts.dropStaleDigests, vacuum: !!opts.vacuum }, { prunedVectors, staleDigestsRemoved, vacuumed }, true);
    tracer.appendJournal({ cmd: 'gc', args: { pruneVectors: !!opts.pruneVectors, dropStaleDigests: !!opts.dropStaleDigests, vacuum: !!opts.vacuum }, receipt });
  } catch (e) {
    console.error(chalk.red('❌ gc failed:'), (e as Error).message);
  } finally {
    await ctx.cleanup();
  }
}
