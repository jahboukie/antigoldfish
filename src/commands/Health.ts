import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryEngine } from '../MemoryEngine';

export async function handleHealth(ctx: { memoryEngine: MemoryEngine; proEnabled: boolean; cleanup: () => Promise<void>; }, opts?: any): Promise<void> {
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    await ctx.memoryEngine.initialize();
    const project = ctx.memoryEngine.getProjectInfo();
    const stats = await ctx.memoryEngine.getStats();
    const vec = await ctx.memoryEngine.database.vectorStats();
    let digests = 0;
    try { digests = await (ctx.memoryEngine.database as any).countFileDigests?.(); } catch {}

    // Optional deltas since N days
    let sinceDays: number | null = null;
    let memDelta = 0;
    let vecDelta = 0;
    let sinceISO: string | null = null;
    if (opts && opts.since !== undefined) {
      const n = parseInt(String(opts.since), 10);
      if (Number.isFinite(n) && n > 0) {
        sinceDays = n;
        const since = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
        sinceISO = new Date(since.getTime() - since.getTimezoneOffset()*60000).toISOString().replace('Z', '');
        try { memDelta = await (ctx.memoryEngine.database as any).countMemoriesSince?.(sinceISO); } catch {}
        try { vecDelta = await (ctx.memoryEngine.database as any).countVectorsSince?.(sinceISO); } catch {}
      }
    }

    // Lightweight local rollups from receipts (last 7 days default when sinceDays not set)
    const receiptsDirPrimary = path.join(process.cwd(), '.securamem', 'receipts');
    const receiptsDirLegacy = path.join(process.cwd(), '.antigoldfishmode', 'receipts');
    const receiptsDir = fs.existsSync(receiptsDirPrimary) ? receiptsDirPrimary : receiptsDirLegacy;
    let sinceWindowDays = sinceDays ?? 7;
    const cutoffTs = Date.now() - sinceWindowDays * 24 * 60 * 60 * 1000;
    let searchDurations: number[] = [];
    let cmdCounts: Record<string, { ok: number; err: number }> = {};
    try {
      if (fs.existsSync(receiptsDir)) {
        const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const full = path.join(receiptsDir, f);
            const rec = JSON.parse(fs.readFileSync(full, 'utf8')) as any;
            const started = Date.parse(rec.startTime || '');
            if (!Number.isFinite(started) || started < cutoffTs) continue;
            const cmd = String(rec.command || 'unknown');
            if (!cmdCounts[cmd]) cmdCounts[cmd] = { ok: 0, err: 0 };
            if (rec.success) cmdCounts[cmd].ok++; else cmdCounts[cmd].err++;
            if (cmd === 'search-code' && typeof rec.durationMs === 'number') {
              searchDurations.push(rec.durationMs);
            }
          } catch {}
        }
      }
    } catch {}

    const pct = (arr: number[], p: number): number | null => {
      if (!arr.length) return null; const s = [...arr].sort((a,b)=>a-b); const idx = Math.min(s.length-1, Math.floor((p/100)*s.length)); return s[idx];
    };
    const searchP50 = pct(searchDurations, 50);
    const searchP95 = pct(searchDurations, 95);
    const totalSearches = searchDurations.length;
    const errorRateByCmd = Object.fromEntries(Object.entries(cmdCounts).map(([k,v]) => [k, v.ok+v.err>0? +(v.err/(v.ok+v.err)*100).toFixed(1) : 0]));

    const data = {
      projectPath: project.path,
      dbPath: project.dbPath,
      memories: stats.totalMemories,
      dbSizeMB: +(stats.totalSizeBytes / 1024 / 1024).toFixed(2),
      vectors: vec,
      digestEntries: digests,
      sinceDays: sinceDays ?? undefined,
      deltas: sinceDays ? { memories: memDelta, vectors: vecDelta } : undefined,
      metrics: {
        search: { count: totalSearches, p50Ms: searchP50 ?? undefined, p95Ms: searchP95 ?? undefined },
        errors: errorRateByCmd,
      }
    };

    if (tracer.flags.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.cyan('🩺 SecuraMem Health'));
      console.log(`   Project: ${data.projectPath}`);
      console.log(`   DB: ${data.dbPath} (${data.dbSizeMB} MB)`);
      console.log(`   Memories: ${data.memories}`);
      console.log(`   Vectors: backend=${vec.backend}, dim=${vec.dimensions}, count=${vec.count}${vec.note?`, note=${vec.note}`:''}`);
      console.log(`   Digest cache entries: ${digests}`);
      if (data.metrics.search.count) {
        console.log(`   Search latency: p50=${data.metrics.search.p50Ms}ms p95=${data.metrics.search.p95Ms}ms (n=${data.metrics.search.count})`);
      }
      if (Object.keys(data.metrics.errors).length) {
        const worst = Object.entries(data.metrics.errors).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}=${v}%`).join(', ');
        console.log(`   Error rate by cmd: ${worst}`);
      }
      console.log(`   Pro (honor-system): ${ctx.proEnabled ? 'ENABLED' : 'disabled'}`);
      if (sinceDays) {
        console.log(`   𝚫 Last ${sinceDays} day(s): +${memDelta} memories, +${vecDelta} vectors`);
        if (vecDelta > 0 && digests > 0) {
          console.log(chalk.gray('   Hint: run "smem gc --prune-vectors --drop-stale-digests" to tidy up if growth is high.'));
        }
      }
      console.log(chalk.gray('   Tip: run "smem gc --prune-vectors --drop-stale-digests --vacuum" to tidy up.'));
    }

    const receipt = tracer.writeReceipt('health', { sinceDays }, data, true);
    tracer.appendJournal({ cmd: 'health', args: { sinceDays }, receipt });
  } catch (e) {
    console.error(chalk.red('❌ health failed:'), (e as Error).message);
  } finally {
    await ctx.cleanup();
  }
}
