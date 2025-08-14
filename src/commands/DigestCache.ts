import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';

export async function handleDigestCache(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; }, opts: any): Promise<void> {
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    await ctx.memoryEngine.initialize();
    if (opts.clear) {
      const n = await (ctx.memoryEngine.database as any).clearFileDigests?.();
      console.log(chalk.green(`✅ Cleared ${n} digest entr${(n===1)?'y':'ies'}`));
      const receipt = tracer.writeReceipt('digest-cache', { action: 'clear' }, { cleared: n }, true);
      tracer.appendJournal({ cmd: 'digest-cache', args: { clear: true }, receipt });
    } else if (opts.list) {
      const limit = parseInt(String(opts.limit || '50'), 10) || 50;
      const rows = await (ctx.memoryEngine.database as any).listFileDigests?.(limit);
      if (!rows || rows.length === 0) {
        console.log('ℹ️ No digests cached.');
      } else {
        for (const r of rows) console.log(`${r.updatedAt}  ${r.digest}  ${r.file}`);
        console.log(`\nTotal: ${rows.length} shown${rows.length === limit ? ' (truncated)' : ''}.`);
      }
      const receipt = tracer.writeReceipt('digest-cache', { action: 'list', limit }, { shown: rows?.length || 0 }, true);
      tracer.appendJournal({ cmd: 'digest-cache', args: { list: true, limit }, receipt });
    } else {
      console.log('Usage: smem digest-cache --clear | --list [--limit <n>]');
    }
  } catch (e) {
    console.error(chalk.red('❌ digest-cache failed:'), (e as Error).message);
  } finally {
    await ctx.cleanup();
  }
}
