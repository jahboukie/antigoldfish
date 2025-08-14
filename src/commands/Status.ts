import chalk from 'chalk';
import { MemoryEngine } from '../MemoryEngine';

export async function handleStatus(ctx: {
  memoryEngine: MemoryEngine;
  proEnabled: boolean;
  proMarkerPath: string;
  cleanup: () => Promise<void>;
}) {
  const { Tracer } = await import('../utils/Trace.js');
  const tracer = Tracer.create(process.cwd());
  try {
    tracer.plan('status', { explain: tracer.flags.explain });
    tracer.mirror(`smem status${tracer.flags.explain ? ' --explain' : ''}`);
    if (tracer.flags.explain) {
      console.log(chalk.gray('Explanation: Shows project and memory stats (local-only).'));
    }

    const projectInfo = ctx.memoryEngine.getProjectInfo();

    await ctx.memoryEngine.initialize();
    const memoryStats = await ctx.memoryEngine.getStats();

    const data: any = {
      project: { path: projectInfo.path, dbPath: projectInfo.dbPath },
      memory: {
        total: memoryStats.totalMemories,
        sizeMB: +(memoryStats.totalSizeBytes / 1024 / 1024).toFixed(2)
      }
    };

    if (tracer.flags.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(chalk.cyan('📊 SecuraMem - Unlimited Local-Only Status\n'));
      console.log(chalk.cyan('📁 Project Information:'));
      console.log(`   Path: ${data.project.path}`);
      console.log(`   Database: ${data.project.dbPath}`);
      console.log(chalk.cyan('\n⭐ Pro status (honor-system):'));
      console.log(`   ${ctx.proEnabled ? 'ENABLED' : 'disabled'}  (marker: ${ctx.proMarkerPath})`);
      console.log(chalk.cyan('\n🧠 Memory Statistics:'));
      console.log(`   Total memories: ${data.memory.total}`);
      console.log(`   Database size: ${data.memory.sizeMB} MB`);
    }

    const receipt = tracer.writeReceipt('status', {}, data, true);
    tracer.appendJournal({ cmd: 'status', args: {}, receipt });

    await ctx.cleanup();
  } catch (error) {
    const { Tracer } = await import('../utils/Trace.js');
    const tracer2 = Tracer.create(process.cwd());
    const receipt = tracer2.writeReceipt('status', {}, {}, false, (error as Error).message);
    tracer2.appendJournal({ cmd: 'status', error: (error as Error).message, receipt });
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('❌ Failed to get status:'));
    console.error(chalk.red(`   ${msg}`));
    await ctx.cleanup();
    process.exit(1);
  }
}
