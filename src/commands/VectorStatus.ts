import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';

export async function handleVectorStatus(ctx: { memoryEngine: MemoryEngine; cleanup: () => Promise<void>; }) {
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    tracer.plan('vector-status', { explain: tracer.flags.explain });
    tracer.mirror(`smem vector-status${tracer.flags.explain ? ' --explain' : ''}`);
    if (tracer.flags.explain) {
      console.log(chalk.gray('Explanation: reports the active vector backend (sqlite-vss or local-js), vector dimensions, and stored vector count.'));
    }

    await ctx.memoryEngine.initialize();
    let info: any = { backend: 'local-js', note: 'Advanced vector backend not enabled in this build.' };
    if ((ctx.memoryEngine as any).getVectorBackendInfo) {
      info = await (ctx.memoryEngine as any).getVectorBackendInfo();
    }

    if (tracer.flags.json) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log(chalk.cyan('🧠 Vector Backend Status'));
      console.log(`   Backend: ${info.backend}`);
      if (info.dimensions !== undefined) console.log(`   Dimensions: ${info.dimensions}`);
      if (info.count !== undefined) console.log(`   Vectors: ${info.count}`);
      if (info.note) console.log(`   Note: ${info.note}`);
    }

    const receipt = tracer.writeReceipt('vector-status', {}, info, true);
    tracer.appendJournal({ cmd: 'vector-status', args: {}, receipt });
  } catch (error) {
    const { Tracer } = await import('../utils/Trace.js');
    const tracer2 = Tracer.create(process.cwd());
    const receipt = tracer2.writeReceipt('vector-status', {}, {}, false, (error as Error).message);
    tracer2.appendJournal({ cmd: 'vector-status', error: (error as Error).message, receipt });
    console.error(chalk.red('❌ Failed to get vector status:'), error instanceof Error ? error.message : 'Unknown error');
  } finally {
    await ctx.cleanup();
  }
}
