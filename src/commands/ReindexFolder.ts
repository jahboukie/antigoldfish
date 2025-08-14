import chalk from 'chalk';
import path from 'path';
import { MemoryEngine } from '../MemoryEngine';

export async function handleReindexFolder(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; }, folder: string, opts: any): Promise<void> {
  const absFolder = path.resolve(process.cwd(), folder);
  const root = process.cwd();
  const include: string[] | undefined = opts.include;
  const exclude: string[] | undefined = opts.exclude;
  const useSymbols = !!opts.symbols;
  const maxChunk = parseInt(String(opts.maxChunk || '200'), 10) || 200;
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    await ctx.memoryEngine.initialize();
    const { IndexingService } = await import('../services/IndexingService.js');
    const svc = new IndexingService(ctx.memoryEngine);
    const result = await svc.reindexFolder(absFolder, { root, include, exclude, useSymbols, maxChunk });
    console.log(chalk.green(`✅ Reindexed ${result.files} files under ${path.relative(root, absFolder)||'.'}; chunks added: ${result.added}, errors: ${result.errors}`));
    const receipt = tracer.writeReceipt('reindex-folder', { folder: path.relative(root, absFolder), include, exclude, symbols: useSymbols, maxChunk }, { files: result.files, added: result.added, errors: result.errors }, true);
    tracer.appendJournal({ cmd: 'reindex-folder', args: { folder: path.relative(root, absFolder), include, exclude, symbols: useSymbols, maxChunk }, receipt });
  } catch (e) {
    console.error(chalk.red('❌ reindex-folder failed:'), (e as Error).message);
  } finally {
    await ctx.cleanup();
  }
}
