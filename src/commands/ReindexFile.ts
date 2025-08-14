import chalk from 'chalk';
import path from 'path';
import { MemoryEngine } from '../MemoryEngine';

export async function handleReindexFile(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; nudgePro?: (k: string, msg: string) => void; }, file: string, opts: any): Promise<void> {
  const abs = path.resolve(process.cwd(), file);
  const root = process.cwd();
  const useSymbols = !!opts.symbols;
  if (useSymbols && ctx.nudgePro) {
    ctx.nudgePro('symbols-reindex-folder', 'Pro enhances symbol chunking and speeds up bulk reindex. Proceeding with basic symbol mode.');
  }
  const maxChunk = 200;
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    await ctx.memoryEngine.initialize();
    const { IndexingService } = await import('../services/IndexingService.js');
    const svc = new IndexingService(ctx.memoryEngine);
    const { saved, relUnix } = await svc.reindexSingleFile(abs, { root, useSymbols, maxChunk });
    console.log(chalk.green(`✅ Reindexed ${relUnix} (${saved} chunk${saved===1?'':'s'})`));
    const receipt = tracer.writeReceipt('reindex-file', { file: relUnix, symbols: useSymbols }, { saved }, true);
    tracer.appendJournal({ cmd: 'reindex-file', args: { file: relUnix, symbols: useSymbols }, receipt });
  } catch (e) {
    console.error(chalk.red('❌ reindex-file failed:'), (e as Error).message);
  } finally {
    await ctx.cleanup();
  }
}
