import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { MemoryEngine } from '../MemoryEngine';

export async function handleInitCommand(ctx: {
  memoryEngine: MemoryEngine;
  cleanup: () => Promise<void>;
}, options: any): Promise<void> {
  try {
    console.log(chalk.cyan('🚀 SecuraMem - Project Initialization'));
    console.log(`   Project: ${process.cwd()}`);

    const securamemDir = path.join(process.cwd(), '.securamem');
    const memoryDbPath = path.join(securamemDir, 'memory.db');
    const memoryDbEncPath = memoryDbPath + '.enc';
    const memoryDbTempPath = memoryDbPath + '.temp';

    if ((fs.existsSync(memoryDbPath) || fs.existsSync(memoryDbEncPath)) && !options.force) {
      console.log(chalk.yellow('⚠️ SecuraMem already initialized in this project'));
      console.log(chalk.gray('   Use --force to reinitialize'));
      try { await ensureLocalGuides(securamemDir, false); } catch {}
      return;
    }

    if (options.force) {
      try { if (fs.existsSync(memoryDbPath)) { fs.unlinkSync(memoryDbPath); console.log(chalk.gray('   Removed existing memory.db')); } } catch {}
      try { if (fs.existsSync(memoryDbEncPath)) { fs.unlinkSync(memoryDbEncPath); console.log(chalk.gray('   Removed existing memory.db.enc')); } } catch {}
      try { if (fs.existsSync(memoryDbTempPath)) { fs.unlinkSync(memoryDbTempPath); } } catch {}
    }

    if (!fs.existsSync(securamemDir)) {
      fs.mkdirSync(securamemDir, { recursive: true });
      console.log(chalk.green('✅ Created .securamem directory'));
    }

    await ctx.memoryEngine.initialize();
    console.log(chalk.green('✅ Memory database initialized'));

    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const giPrimary = '\n# SecuraMem\n.securamem/\n';
    const giLegacy = '.antigoldfishmode/';

    try {
      let gitignoreContent = '';
      if (fs.existsSync(gitignorePath)) gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      let changed = false;
      if (!gitignoreContent.includes('.securamem/')) { fs.appendFileSync(gitignorePath, giPrimary); changed = true; }
      if (!gitignoreContent.includes(giLegacy)) { fs.appendFileSync(gitignorePath, '\n' + giLegacy + '\n'); changed = true; }
      if (changed) console.log(chalk.green('✅ Updated .gitignore for SecuraMem (and legacy data dir)'));
    } catch {
      console.log(chalk.yellow('⚠️ Could not update .gitignore (this is optional)'));
    }

    await createVSCodeIntegration();
    await ensureLocalGuides(securamemDir, true);

    console.log(chalk.green('\n🎉 SecuraMem initialized successfully!'));
    console.log(chalk.gray('   You can now use:'));
    console.log(chalk.gray('   • smem remember "information"'));
    console.log(chalk.gray('   • smem recall "search term"'));
    console.log(chalk.gray('   • smem status'));
    console.log(chalk.gray('   • VSCode: Ctrl+Shift+M to remember, Ctrl+Shift+R to recall'));

    await ctx.cleanup();
  } catch (error) {
    console.log(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : 'Unknown error');
    await ctx.cleanup();
    process.exit(1);
  }
}

async function ensureLocalGuides(dir: string, overwrite: boolean) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const aiSrcCandidates = [
    path.join(__dirname, '..', '..', 'AI_ASSISTANT_INSTRUCTIONS.md'),
    path.join(__dirname, '..', 'AI_ASSISTANT_INSTRUCTIONS.md')
  ];
  const aiDst = path.join(dir, 'AI_ASSISTANT_GUIDE.md');
  const aiSrc = aiSrcCandidates.find(p => fs.existsSync(p));
  if (aiSrc && (overwrite || !fs.existsSync(aiDst))) {
    try { fs.copyFileSync(aiSrc, aiDst); console.log(chalk.green('✅ Wrote AI guide to .securamem/AI_ASSISTANT_GUIDE.md')); } catch {}
  }

  const userDst = path.join(dir, 'USER_GUIDE.md');
  if (overwrite || !fs.existsSync(userDst)) {
    const content = `# SecuraMem – User Guide\n\nQuick reference for this project. Data lives under .securamem/. Legacy .antigoldfishmode/ is still read for compatibility.\n\n## First steps\n- smem status\n- smem vector-status\n- smem health [--since 7]\n\n## Index & watch\n- smem index-code --symbols --path .\n- smem watch-code --path src --symbols --max-chunk 200\n\nPolicy tips:\n- smem policy allow-command watch-code\n- smem policy allow-path "**/*"\n\n## Search\n- smem search-code "query" --hybrid --preview 3\n\n## Maintenance\n- smem digest-cache --list --limit 20\n- smem reindex-file <file> [--symbols]\n- smem reindex-folder <folder> [--symbols]\n- smem gc --prune-vectors --drop-stale-digests --vacuum\n\n## Air-gapped export\n- smem export-context --out ./.securamem/ctx.smemctx --type code [--sign]\n- smem import-context ./.securamem/ctx.smemctx\n\nReceipts: .securamem/receipts/*.json\nJournal: .securamem/journal.jsonl\nPolicy: .securamem/policy.json\n`;
    try { fs.writeFileSync(userDst, content); console.log(chalk.green('✅ Wrote User guide to .securamem/USER_GUIDE.md')); } catch {}
  }
}

async function createVSCodeIntegration() {
  try {
    const vscodeDir = path.join(process.cwd(), '.vscode');
    if (!fs.existsSync(vscodeDir)) { fs.mkdirSync(vscodeDir, { recursive: true }); console.log(chalk.green('✅ Created .vscode directory')); }

    let templateDir = path.join(__dirname, '..', '..', '.vscode-templates');
    if (!fs.existsSync(templateDir)) templateDir = path.join(__dirname, '..', '.vscode-templates');
    if (!fs.existsSync(templateDir)) {
      console.log(chalk.yellow('⚠️ VSCode templates not found, skipping VSCode integration'));
      return;
    }

    const tasksTemplate = path.join(templateDir, 'tasks.json');
    const tasksDestination = path.join(vscodeDir, 'tasks.json');
    if (fs.existsSync(tasksTemplate)) { fs.copyFileSync(tasksTemplate, tasksDestination); console.log(chalk.green('✅ VSCode tasks configured')); }

    const settingsTemplate = path.join(templateDir, 'settings.json');
    const settingsDestination = path.join(vscodeDir, 'settings.json');
    if (fs.existsSync(settingsTemplate)) { fs.copyFileSync(settingsTemplate, settingsDestination); console.log(chalk.green('✅ VSCode settings configured')); }
  } catch {
    console.log(chalk.yellow('⚠️ VSCode templates not found, skipping VSCode integration'));
  }
}
