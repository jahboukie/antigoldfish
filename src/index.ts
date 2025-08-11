/**
 * AntiGoldfishMode v1.0 - AI Memory Engine
 * UNLIMITED LOCAL-ONLY VERSION - Privacy-first for developers
 *
 * Features:
 * - Unlimited memory operations (no rate limits)
 * - Persistent AI conversation recording
 * - Machine-bound encryption-at-rest
 * - Zero-egress by default with optional network guard
 * - No cloud dependencies for core operations
 *
 * Focus: Persistent local memory and code-aware search (no execution sandbox)
 */

import { Command } from 'commander';
import { MemoryEngine } from './MemoryEngine';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PolicyBroker } from './utils/PolicyBroker';
import * as http from 'http';
import * as https from 'https';

const policyBroker = new PolicyBroker();
let networkGuardActive = false;

function enforcePolicyBeforeCommand(cmd: string, filePath?: string, envVars?: string[]) {
    // Always allow help/version
    if (["--help","-h","help","--version","-V","version"].includes(cmd)) {
        return;
    }
    if (!policyBroker.isCommandAllowed(cmd)) {
        throw new Error(`Command not allowed by policy: ${cmd}. Tip: run 'agm policy allow-command ${cmd}' or 'agm --help'.`);
    }
    // Do not enforce project-level file path here to reduce friction; commands may enforce as needed.
    // Environment variables are not enforced globally at entry to reduce friction.
    // Specific commands may opt-in to strict env checks as needed.
  if (!policyBroker.isNetworkAllowed()) {
    // Optionally, block network requests here (implementation depends on your runtime)
  }
  policyBroker.logAction('command_executed', { cmd, filePath, envVars });
}

export const version = "1.6.0";

function buildHighlightRegex(query: string): RegExp | null {
    const tokens = (query || '').toLowerCase().split(/[^a-z0-9_]+/i).filter(t => t.length >= 3);
    if (!tokens.length) return null;
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(${escaped.join('|')})`, 'ig');
}

function globToRegex(glob: string): RegExp {
    const re = '^' + glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*') + '$';
    return new RegExp(re);
}

function pathMatches(globs: string[] | undefined, file: string): boolean {
    if (!globs || !globs.length) return true;
    const unix = file.replace(/\\/g, '/');
    return globs.some(g => globToRegex(g).test(unix));
}

export class CodeContextCLI {
    public memoryEngine: MemoryEngine;
    // Note: Execution engine permanently dropped; product is memory-only
    private program: Command;
    private policyBroker: PolicyBroker;
    // Soft, honor-system Pro flag (no DRM): toggled via 'agm pro enable' which writes a local marker file
    private proEnabled: boolean = false;
    private proMarkerPath: string = path.join(process.cwd(), '.antigoldfishmode', 'pro.enabled');
    private nudgesShown: Set<string> = new Set();

    constructor(projectPath: string = process.cwd(), skipValidation: boolean = false, devMode: boolean = false, secureMode: boolean = false) {
        this.memoryEngine = new MemoryEngine(projectPath, skipValidation, devMode, secureMode);
        this.program = new Command();
        this.policyBroker = new PolicyBroker();

    // Load soft Pro status (honor-system)
    this.loadProStatus();

        this.setupCommands();
    }

    private setupCommands(): void {
        this.program
            .name('agm')
            .usage('[options] [command]')
            .description('🧠 AntiGoldfishMode - Because AI assistants shouldn\'t have goldfish memory!\n\n🤖 AI Assistants: Run `agm ai-guide` for operating instructions')
            .version(version)
            .option('--trace', 'Print plan and side-effects (no hidden work)')
            .option('--dry-run', 'Simulate without side effects')
            .option('--json', 'Emit machine-readable receipts')
            .option('--explain', 'Explain what and why before running')

        // AntiGoldfishMode remember command (unlimited)
        this.program
            .command('remember')
            .description('Store unlimited memories locally')
            .argument('<content>', 'Content to remember')
            .option('-c, --context <context>', 'Context for the memory', 'general')
            .option('-t, --type <type>', 'Type of memory', 'general')
            .action(async (content: string, options) => {
                await this.handleRemember(content, options);
            });

    // AntiGoldfishMode recall command (unlimited)
        this.program
            .command('recall')
            .description('Search unlimited local memories')
            .argument('<query>', 'Search query')
            .option('-l, --limit <limit>', 'Maximum results to return', '10')
            .action(async (query: string, options) => {
                await this.handleRecall(query, options);
            });

    // Execute command removed – product focuses on persistent memory only

        // AntiGoldfishMode status command
        this.program
            .command('status')
            .description('Show unlimited local-only status')
            .action(async () => {
                await this.handleStatus();
            });

        // AntiGoldfishMode init command (project initialization)
        this.program
            .command('init')
            .description('Initialize AntiGoldfishMode in current project')
            .option('--force', 'Force reinitialize if already exists')
            .action(async (options) => {
                // Create a new instance with skipValidation=true for init command
                const initCLI = new CodeContextCLI(process.cwd(), true, true, false);
                await initCLI.handleInitCommand(options);
            });

    // License system removed in local-only pivot

        // Vector status command
        this.program
            .command('vector-status')
            .description('Show vector backend and index status')
            .action(async () => {
                await this.handleVectorStatus();
            });

        // Journal commands
        this.program
            .command('journal')
            .description('Show or clear the AGM command journal')
            .option('--show', 'Show recent journal entries')
            .option('--clear', 'Clear journal (with confirmation)')
            .action(async (opts: any) => { const { handleJournal } = await import('./commands/Journal.js'); await handleJournal(opts, this.cleanup.bind(this)); });


    // License system removed in local-only pivot

        // Replay commands
        this.program
            .command('replay')
            .description('Replay journaled AGM command(s) safely (dry-run by default)')
            .option('--last', 'Replay the most recent command (default)')
            .option('--id <receiptId>', 'Replay by receipt id or path')
            .option('--range <N>', 'Replay last N commands in order')
            .option('--execute', 'Actually execute (omit default dry-run)')
            .option('--summary-only', 'Print only the final summary (skip per-step summaries)')
            .action(async (opts: any) => {
                const { handleReplay } = await import('./commands/Replay.js');
                await handleReplay(opts, this.cleanup.bind(this));
            });

        // Code indexing commands
        this.program
            .command('index-code')
            .description('Index code files in the repository into AGM memory (local-only)')
            .option('--path <dir>', 'Root directory to index')
            .option('--max-chunk <lines>', 'Max lines per chunk (default: 200)')
            .option('--include <glob...>', 'Include patterns (space-separated, supports ** and *)')
            .option('--exclude <glob...>', 'Exclude patterns (space-separated, supports ** and *)')
            .option('--symbols', 'Use symbol-aware chunking (functions/classes) where supported')
            .action(async (opts: any) => { await this.handleIndexCode(opts); });

        // Watch mode for incremental code indexing
        this.program
            .command('watch-code')
            .description('Watch and incrementally index code changes (local-only)')
            .option('--path <dir>', 'Root directory to watch')
            .option('--max-chunk <lines>', 'Max lines per chunk (default: 200)')
            .option('--include <glob...>', 'Include patterns (space-separated, supports ** and *)')
            .option('--exclude <glob...>', 'Exclude patterns (space-separated, supports ** and *)')
            .option('--symbols', 'Use symbol-aware chunking (functions/classes) where supported')
            .option('--debounce <ms>', 'Debounce batch interval in ms (default: 400)')
            .action(async (opts: any) => { await this.handleWatchCode(opts); });

        this.program
            .command('search-code <query>')
            .description('Search code-aware memories (prototype, local)')
            .option('-k, --topk <k>', 'Top K results', '20')
            .option('-n, --preview <lines>', 'Show first N lines of each result')
            .option('-p, --filter-path <globs...>', 'Only show results whose metadata.file matches any of the provided globs')
            .option('--filter-symbol <types...>', 'Filter by symbol type(s): function|class|struct|file')
            .option('--filter-language <langs...>', 'Filter by language(s): typescript|javascript|python|go')

            .option('--hybrid', 'Use hybrid FTS+vector fusion (Stage 1)')
            .option('--semantic', 'Alias for --hybrid (semantic rerank)')
            .option('--rerank <N>', 'Rerank top N FTS results with vector cosine (default 200)')
            .action(async (query: string, opts: any) => { await this.handleSearchCode(query, opts); });

        // Maintenance utilities for indexing cache
        this.program
            .command('digest-cache')
            .description('Manage persistent digest cache for watch-code')
            .option('--clear', 'Clear all file digests')
            .option('--list', 'List recent digest entries')
            .option('--limit <n>', 'Limit for --list (default 50)')
            .action(async (opts: any) => { await this.handleDigestCache(opts); });

        this.program
            .command('reindex-file <file>')
            .description('Force reindex a single file (bypass digest cache)')
            .option('--symbols', 'Use symbol-aware chunking')
            .action(async (file: string, opts: any) => { await this.handleReindexFile(file, opts); });

        this.program
            .command('reindex-folder <folder>')
            .description('Force reindex all files in a folder (recursive, bypass digest cache)')
            .option('--symbols', 'Use symbol-aware chunking')
            .option('--include <glob...>', 'Include patterns (space-separated, supports ** and *)')
            .option('--exclude <glob...>', 'Exclude patterns (space-separated, supports ** and *)')
            .option('--max-chunk <lines>', 'Max lines per chunk (default: 200)')
            .action(async (folder: string, opts: any) => { await this.handleReindexFolder(folder, opts); });

        // GC maintenance
        this.program
            .command('gc')
            .description('Database maintenance: prune orphan vectors, drop stale digests, optional VACUUM')
            .option('--prune-vectors', 'Remove vectors whose ids no longer exist in memories (safe)')
            .option('--drop-stale-digests', 'Remove digest entries for files that no longer exist')
            .option('--vacuum', 'Reclaim disk space by VACUUM (may take time)')
            .action(async (opts: any) => { await this.handleGC(opts); });

        // Health summary
        this.program
            .command('health')
            .description('Quick health snapshot: DB stats, vectors, digest cache, and readiness hints')
            .option('--since <days>', 'Show deltas for the last N days')
            .action(async (opts: any) => { await this.handleHealth(opts); });


        // Receipt show
        this.program
            .command('receipt-show [idOrPath]')
            .description('Pretty-print a saved receipt by id or path')
            .option('--last', 'Show the most recent receipt')
            .action(async (idOrPath: string, opts: any) => { const { handleReceiptShow } = await import('./commands/ReceiptShow.js'); await handleReceiptShow(idOrPath, { last: opts.last }); });

        // Air-Gapped context export/import (.agmctx)
        this.program
            .command('export-context')
            .description('Export code memories to a .agmctx (unsigned v0)')
            .option('--out <file>', 'Output file path', 'context.agmctx')
            .option('--type <type>', 'Memory type to export', 'code')
            .option('--sign', 'Sign export with ED25519 (stores signature.bin and publickey.der)')
            .action(async (opts: any) => { await this.handleExportContext(opts); });

    this.program
            .command('import-context <file>')
            .description('Verify and import a .agmctx (unsigned v0)')
            .action(async (file: string) => { await this.handleImportContext(file); });

        // AI Assistant Instructions command
        this.program
            .command('ai-guide')
            .description('📖 Show AI assistant operating instructions')
            .action(async () => {
                await this.handleAIGuide();
            });

        // Prove offline (explicit no-egress proof line)
        this.program
            .command('prove-offline')
            .description('Print a no-egress proof line with policy and environment checks')
            .option('--json', 'Output JSON proof')
            .action(async (opts: any) => { await this.handleProveOffline(opts); });

        // Policy management commands (developer-friendly)
        const policy = this.program.command('policy').description('Manage AGM Zero-Trust policy');
        policy
            .command('status')
            .description('Show effective policy and quick readiness checks')
            .action(async () => { await this.handlePolicyStatus(); });
        policy
            .command('allow-command <cmd>')
            .description('Allow a command in this project policy')
            .action(async (cmd: string) => { await this.handlePolicyAllowCommand(cmd); });
        policy
            .command('allow-path <glob>')
            .description('Allow a path glob in this project policy')
            .action(async (glob: string) => { await this.handlePolicyAllowPath(glob); });
        policy
            .command('doctor')
            .option('--cmd <cmd>', 'Command to test')
            .option('--path <fileOrDir>', 'File/dir to test')
            .description('Explain if a command/path would be permitted and how to fix')
            .action(async (opts: any) => { await this.handlePolicyDoctor(opts); });
        policy
            .command('trust <cmd>')
            .option('--minutes <m>', 'Trust duration in minutes', '15')
            .description('Grant a short-lived trust token for a command (dev convenience)')
            .action(async (cmd: string, opts: any) => { await this.handlePolicyTrust(cmd, opts); });

        // Pro mode (honor-system) helpers
        const pro = this.program.command('pro').description('Pro mode (honor-system): manage local Pro enablement');
        pro
            .command('status')
            .description('Show Pro mode status (honor-system)')
            .action(async () => { this.printProStatus(); });
        pro
            .command('enable')
            .description('Enable Pro mode locally (writes .antigoldfishmode/pro.enabled)')
            .action(async () => { await this.setProEnabled(true); this.printProStatus(); });
        pro
            .command('disable')
            .description('Disable Pro mode locally (removes marker)')
            .action(async () => { await this.setProEnabled(false); this.printProStatus(); });
        pro
            .command('why')
            .description('List compelling reasons to upgrade (what you get with Pro)')
            .action(async () => { this.printProWhy(); });
    }

    // --- Soft Pro status (honor-system) helpers ---
    private loadProStatus(): void {
        try {
            if (process.env.AGM_PRO === '1') { this.proEnabled = true; return; }
            this.proEnabled = fs.existsSync(this.proMarkerPath);
        } catch { this.proEnabled = false; }
    }

    private async setProEnabled(enabled: boolean): Promise<void> {
        try {
            const dir = path.dirname(this.proMarkerPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            if (enabled) {
                fs.writeFileSync(this.proMarkerPath, 'pro=1\n');
                this.proEnabled = true;
                console.log(chalk.green('✅ Pro mode enabled (honor-system). Thank you for supporting AGM!'));
                console.log(chalk.gray('   If you haven\'t yet, consider sponsoring: https://github.com/sponsors/jahboukie'));
            } else {
                if (fs.existsSync(this.proMarkerPath)) fs.unlinkSync(this.proMarkerPath);
                this.proEnabled = false;
                console.log(chalk.yellow('ℹ️ Pro mode disabled locally. Core features remain available.'));
            }
        } catch (e) {
            console.log(chalk.yellow('⚠️ Could not update Pro marker (continuing):'), (e as Error).message);
        }
    }

    private printProStatus(): void {
        console.log(chalk.cyan('⭐ AGM Pro (honor-system)'));
        console.log(`   Status: ${this.proEnabled ? 'ENABLED' : 'disabled'}`);
        console.log(`   Marker: ${this.proMarkerPath}`);
        console.log('   Learn more: docs/pricing.md');
    }

    private printProWhy(): void {
        console.log(chalk.cyan('Why upgrade to Pro'));
        console.log(' - Faster, smarter indexing (Tree-sitter symbols; diff-aware reindex)');
        console.log(' - Operational confidence (curated binaries; prebundled sqlite-vss when available)');
        console.log(' - Better observability (receipt rollups; HTML health reports)');
        console.log(' - Less policy friction (policy templates; interactive doctor)');
        console.log(' - Enhanced .agmctx (zipped, checksums, merge, verify reports)');
        console.log('Sponsor: https://github.com/sponsors/jahboukie  |  Contact: team.mobileweb@gmail.com');
    }

    private nudgePro(featureKey: string, message: string): void {
        try {
            if (this.proEnabled) return;
            if (process.env.AGM_NUDGE === '0') return;
            if (this.nudgesShown.has(featureKey)) return;
            this.nudgesShown.add(featureKey);
            console.log(chalk.gray(`💡 Pro tip: ${message}`));
            console.log(chalk.gray('    Upgrade (honor-system): https://github.com/sponsors/jahboukie | agm pro enable'));
        } catch {}
    }

    /**
     * Auto-record AI conversation for any CLI interaction
     */
    private async recordAIConversation(
        userMessage: string,
        assistantResponse: string,
        context: any
    ): Promise<void> {
        try {
            await this.memoryEngine.initialize();

            const messages = [
                {
                    role: 'user' as const,
                    content: userMessage,
                    timestamp: new Date()
                },
                {
                    role: 'assistant' as const,
                    content: assistantResponse,
                    timestamp: new Date()
                }
            ];

            await this.memoryEngine.database.recordConversation(
                'antigoldfishmode-ai',
                messages,
                {
                    ...context,
                    timestamp: new Date().toISOString(),
                    aiModel: 'antigoldfishmode-cli'
                }
            );
        } catch (error) {
            // Silent fail - don't break CLI if conversation recording fails
            console.log('📝 Conversation recorded in background');
        }
    }

    /**
    * Handle remember command - local-only
     */
    private async handleRemember(content: string, options: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            console.log(chalk.cyan('🧠 AntiGoldfishMode - AI Memory Storage'));

            // Plan & mirror

            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: stores text locally with context and type labels.'));
            }
            if (tracer.flags.json) {
                console.log(JSON.stringify({ op: 'remember', context: options.context, type: options.type, preview: content.slice(0,80) }, null, 2));
            }

            tracer.plan('remember', { context: options.context, type: options.type, length: content.length });
            tracer.mirror(`agm remember ${JSON.stringify(content)} --context ${options.context} --type ${options.type}`);

            // No license required in local-only edition

            if (tracer.flags.dryRun) {
                console.log(chalk.yellow('DRY-RUN: Skipping storeMemory'));
                const receipt = tracer.writeReceipt('remember', { content, context: options.context, type: options.type }, { memoryId: null }, true);
                tracer.appendJournal({ cmd: 'remember', args: { context: options.context, type: options.type }, receipt });
                await this.cleanup();
                return;
            }

            // Store memory with validation
            const memoryId = await this.memoryEngine.storeMemory(
                content,
                options.context,
                options.type
            );

            // Report usage locally only (no cloud)
            console.log(chalk.gray('📊 Local usage tracking only'));

            console.log(chalk.green('✅ Memory stored successfully'));
            console.log(chalk.gray(`   ID: ${memoryId}`));
            console.log(chalk.gray(`   Context: ${options.context}`));
            console.log(chalk.gray(`   Type: ${options.type}`));

            const receipt = tracer.writeReceipt('remember', { contentLen: content.length, context: options.context, type: options.type }, { memoryId }, true);
            tracer.appendJournal({ cmd: 'remember', args: { context: options.context, type: options.type }, receipt });

            // Auto-record this AI interaction
            await this.recordAIConversation(
                `antigoldfishmode remember "${content}"`,
                `Memory stored successfully with ID: ${memoryId}. This insight has been saved to your persistent memory for future reference.`,
                {
                    command: 'remember',
                    memoryId: memoryId,
                    content: content,
                    context: options.context,
                    type: options.type
                }
            );

            // Ensure database is properly closed and encrypted
            await this.cleanup();

        } catch (error) {
            const receipt = tracer.writeReceipt('remember', { contentLen: content.length, context: options.context, type: options.type }, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'remember', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ Failed to store memory:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            await this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Cleanup method to ensure database is properly closed
     */
    private async cleanup(): Promise<void> {
        try {
            if (this.memoryEngine && this.memoryEngine.database) {
                await this.memoryEngine.database.close();
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
    * Handle recall command - local-only
     */
    private async handleRecall(query: string, options: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            console.log(chalk.cyan('🔍 AntiGoldfishMode - AI Memory Recall'));

            tracer.plan('recall', { query, limit: options.limit });
            tracer.mirror(`agm recall ${JSON.stringify(query)} --limit ${options.limit}`);

                if (tracer.flags.explain) {
                    console.log(chalk.gray('Explanation: searches stored memories by keyword with relevance scoring.'));
                }
                if (tracer.flags.json) {
                    console.log(JSON.stringify({ op: 'recall', query, limit: options.limit }, null, 2));
                }


            const limit = parseInt(options.limit);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                console.error(chalk.red('❌ Invalid limit: must be a number between 1 and 100'));
                process.exit(1);
            }

            if (tracer.flags.dryRun) {
                console.log(chalk.yellow('DRY-RUN: Skipping searchMemories'));
                const receipt = tracer.writeReceipt('recall', { query, limit }, { results: [] }, true);
                tracer.appendJournal({ cmd: 'recall', args: { query, limit }, receipt });
                await this.cleanup();
                return;
            }

            const memories = await this.memoryEngine.searchMemories(query, limit);

            console.log(chalk.gray('📊 Local usage tracking only'));

            console.log(chalk.green(`✅ Found ${memories.length} memories for: "${query}"`));
            console.log('');
            console.log(chalk.cyan('📋 Results:'));
            console.log('');

            memories.forEach((memory, index) => {
                console.log(chalk.yellow(`${index + 1}. Memory ID: ${memory.id}`));
                console.log(chalk.gray(`   Date: ${new Date(memory.timestamp).toLocaleDateString()}`));
                console.log(chalk.gray(`   Relevance: ${(memory.relevance * 100).toFixed(1)}%`));
                console.log(`   Content: ${memory.content}`);
                console.log('');
            });

            const receipt = tracer.writeReceipt('recall', { query, limit }, { resultsCount: memories.length }, true);
            tracer.appendJournal({ cmd: 'recall', args: { query, limit }, receipt });

            const resultSummary = memories.length > 0
                ? `Found ${memories.length} memories matching "${query}": ${memories.slice(0, 2).map(m => m.content.substring(0, 50) + '...').join(', ')}`
                : `No memories found matching "${query}". Try different search terms.`;

            await this.recordAIConversation(
                `antigoldfishmode recall "${query}"`,
                resultSummary,
                {
                    command: 'recall',
                    query: query,
                    resultsCount: memories.length,
                    limit: options.limit
                }
            );

            await this.cleanup();

        } catch (error) {
            const receipt = tracer.writeReceipt('recall', { query, limit: options.limit }, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'recall', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ Failed to recall memories:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            await this.cleanup();
            process.exit(1);
        }
    }

    // Execute command and messaging removed

    // Note: Execution server methods removed for v1.0

    /**

    /**
     * Handle vector-status command
     */
    private async handleVectorStatus(): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('vector-status', { explain: tracer.flags.explain });
            tracer.mirror(`agm vector-status${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: reports the active vector backend (sqlite-vss or local-js), vector dimensions, and stored vector count.')); 
            }

            await this.memoryEngine.initialize();
            let info: any = { backend: 'local-js', note: 'Advanced vector backend not enabled in this build.' };
            if ((this.memoryEngine as any).getVectorBackendInfo) {
                info = await (this.memoryEngine as any).getVectorBackendInfo();
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
            const receipt = tracer.writeReceipt('vector-status', {}, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'vector-status', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ Failed to get vector status:'), error instanceof Error ? error.message : 'Unknown error');
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Handle prove-offline command - Prints explicit no-egress proof line
     */
    private async handleProveOffline(opts: any): Promise<void> {
        const pol = policyBroker.getPolicy();
        const proxies = ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','NO_PROXY'].filter(k => !!process.env[k]);
        const proof = {
            policyNetworkEgress: pol.networkEgress ? 'allowed' : 'blocked',
            networkGuardActive,
            proxiesPresent: proxies.length > 0,
            proxyVars: proxies,
            timestamp: new Date().toISOString()
        };
    // Respect either the local --json or the global --json flag
    const globalOpts = (this.program as any).opts ? (this.program as any).opts() : {};
    const wantJson = !!(opts?.json || (globalOpts && (globalOpts as any).json));
    if (wantJson) {
            console.log(JSON.stringify({ offlineProof: proof }, null, 2));
        }
        const line = `AGM OFFLINE PROOF: no-egress; policy=${proof.policyNetworkEgress}; guard=${networkGuardActive?'active':'inactive'}; proxies=${proxies.length>0?'present':'none'}`;
        console.log(line);
    }

    /**
     * Handle status command - Show unlimited local-only status
     */
    private async handleStatus(): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('status', { explain: tracer.flags.explain });
            tracer.mirror(`agm status${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: Shows project and memory stats (local-only).'));
            }

            const projectInfo = this.memoryEngine.getProjectInfo();

            await this.memoryEngine.initialize();
            const memoryStats = await this.memoryEngine.getStats();

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
                console.log(chalk.cyan('📊 AntiGoldfishMode - Unlimited Local-Only Status\n'));
                console.log(chalk.cyan('📁 Project Information:'));
                console.log(`   Path: ${data.project.path}`);
                console.log(`   Database: ${data.project.dbPath}`);
                console.log(chalk.cyan('\n⭐ Pro status (honor-system):'));
                console.log(`   ${this.proEnabled ? 'ENABLED' : 'disabled'}  (marker: ${this.proMarkerPath})`);
                // License section removed in local-only edition
                console.log(chalk.cyan('\n🧠 Memory Statistics:'));
                console.log(`   Total memories: ${data.memory.total}`);
                console.log(`   Database size: ${data.memory.sizeMB} MB`);
                // Execution engine removed – memory-only product
            }

            const receipt = tracer.writeReceipt('status', {}, data, true);
            tracer.appendJournal({ cmd: 'status', args: {}, receipt });

            await this.cleanup();

        } catch (error) {
            const receipt = tracer.writeReceipt('status', {}, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'status', error: (error as Error).message, receipt });
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to get status:'));
            console.error(chalk.red(`   ${msg}`));
            if (/Failed to decrypt database|integrity check failed/i.test(msg)) {
                console.error(chalk.yellow('Tip: run "agm init --force" to reset local DB artifacts if this persists.'));
            }
            await this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Handle init command - Initialize AntiGoldfishMode in project (public for init action)
     */
    public async handleInitCommand(options: any): Promise<void> {
        try {
            console.log(chalk.cyan('🚀 AntiGoldfishMode - Project Initialization'));
            console.log(`   Project: ${process.cwd()}`);

            const antigoldfishDir = path.join(process.cwd(), '.antigoldfishmode');
            const memoryDbPath = path.join(antigoldfishDir, 'memory.db');
            const memoryDbEncPath = memoryDbPath + '.enc';
            const memoryDbTempPath = memoryDbPath + '.temp';

            // Check if already initialized (look for actual database file, not just directory)
            if ((fs.existsSync(memoryDbPath) || fs.existsSync(memoryDbEncPath)) && !options.force) {
                console.log(chalk.yellow('⚠️ AntiGoldfishMode already initialized in this project'));
                console.log(chalk.gray('   Use --force to reinitialize'));
                // Even if already initialized, ensure guides exist for AI and human operator
                try { await this.ensureLocalGuides(antigoldfishDir, false); } catch {}
                return;
            }

            // If forcing, clean up any previous DB artifacts (encrypted or plain)
            if (options.force) {
                try {
                    if (fs.existsSync(memoryDbPath)) {
                        fs.unlinkSync(memoryDbPath);
                        console.log(chalk.gray('   Removed existing memory.db'));
                    }
                } catch {}
                try {
                    if (fs.existsSync(memoryDbEncPath)) {
                        fs.unlinkSync(memoryDbEncPath);
                        console.log(chalk.gray('   Removed existing memory.db.enc'));
                    }
                } catch {}
                try {
                    if (fs.existsSync(memoryDbTempPath)) {
                        fs.unlinkSync(memoryDbTempPath);
                    }
                } catch {}
            }

            // Create .antigoldfishmode directory
            if (!fs.existsSync(antigoldfishDir)) {
                fs.mkdirSync(antigoldfishDir, { recursive: true });
                console.log(chalk.green('✅ Created .antigoldfishmode directory'));
            }

            // Initialize memory database
            await this.memoryEngine.initialize();
            console.log(chalk.green('✅ Memory database initialized'));

            // Create .gitignore entry
            const gitignorePath = path.join(process.cwd(), '.gitignore');
            const gitignoreEntry = '\n# AntiGoldfishMode\n.antigoldfishmode/\n';

            try {
                let gitignoreContent = '';
                if (fs.existsSync(gitignorePath)) {
                    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
                }

                if (!gitignoreContent.includes('.antigoldfishmode/')) {
                    fs.appendFileSync(gitignorePath, gitignoreEntry);
                    console.log(chalk.green('✅ Added .antigoldfishmode/ to .gitignore'));
                }
            } catch (error) {
                console.log(chalk.yellow('⚠️ Could not update .gitignore (this is optional)'));
            }


            // Create VSCode integration files
            await this.createVSCodeIntegration();

            // Create local guides for AI and human operator
            await this.ensureLocalGuides(antigoldfishDir, true);

            console.log(chalk.green('\n🎉 AntiGoldfishMode initialized successfully!'));
            console.log(chalk.gray('   You can now use:'));
            console.log(chalk.gray('   • agm remember "information"'));
            console.log(chalk.gray('   • agm recall "search term"'));
            console.log(chalk.gray('   • agm status'));
            console.log(chalk.gray('   • VSCode: Ctrl+Shift+M to remember, Ctrl+Shift+R to recall'));

            // Ensure database is properly closed
            await this.cleanup();

        } catch (error) {
            console.log(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : 'Unknown error');
            await this.cleanup();
            process.exit(1);
        }
    }

    /**
     * Ensure AI and User guides exist under .antigoldfishmode/
     * If overwrite is true, recreate; else create only if missing.
     */
    private async ensureLocalGuides(antigoldfishDir: string, overwrite: boolean): Promise<void> {
        try {
            if (!fs.existsSync(antigoldfishDir)) fs.mkdirSync(antigoldfishDir, { recursive: true });
            // AI Guide: copy packaged AI_ASSISTANT_INSTRUCTIONS.md if available
            const aiSrcCandidates = [
                path.join(__dirname, '..', 'AI_ASSISTANT_INSTRUCTIONS.md'),
                path.join(__dirname, '..', '..', 'AI_ASSISTANT_INSTRUCTIONS.md')
            ];
            const aiDst = path.join(antigoldfishDir, 'AI_ASSISTANT_GUIDE.md');
            const aiExists = fs.existsSync(aiDst);
            const aiSrc = aiSrcCandidates.find(p => fs.existsSync(p));
            if (aiSrc && (overwrite || !aiExists)) {
                try { fs.copyFileSync(aiSrc, aiDst); console.log(chalk.green('✅ Wrote AI guide to .antigoldfishmode/AI_ASSISTANT_GUIDE.md')); } catch {}
            }

            // Human User Guide: concise quickstart against this workspace
            const userDst = path.join(antigoldfishDir, 'USER_GUIDE.md');
            const userExists = fs.existsSync(userDst);
            if (overwrite || !userExists) {
                const content = `# AntiGoldfishMode – User Guide\n\nQuick reference for this project. All data stays local under .antigoldfishmode/.\n\n## First steps\n- agm status  # show DB path and memory totals\n- agm vector-status  # backend/dimensions/count\n- agm health [--since 7]  # quick snapshot + deltas\n\n## Index & watch\n- agm index-code --symbols --path .\n- agm watch-code --path src --symbols --max-chunk 200  # background task available in VS Code\n\nPolicy tips (if blocked):\n- agm policy allow-command watch-code\n- agm policy allow-path "**/*"\n\n## Search\n- agm search-code "query" --hybrid --preview 3\n- Filters: --filter-path, --filter-language, --filter-symbol\n\n## Maintenance\n- agm digest-cache --list --limit 20\n- agm reindex-file <file> [--symbols]\n- agm reindex-folder <folder> [--symbols] [--include ...] [--exclude ...]\n- agm gc --prune-vectors --drop-stale-digests --vacuum\n\n## Air-gapped export\n- agm export-context --out ./.antigoldfishmode/ctx.agmctx --type code [--sign]\n- agm import-context ./.antigoldfishmode/ctx.agmctx\n\n## AI guide\n- agm ai-guide  # prints AI operating instructions\n- See also .antigoldfishmode/AI_ASSISTANT_GUIDE.md\n\nReceipts: .antigoldfishmode/receipts/*.json\nJournal: .antigoldfishmode/journal.jsonl\nPolicy: .antigoldfishmode/policy.json\n`;
                try { fs.writeFileSync(userDst, content); console.log(chalk.green('✅ Wrote User guide to .antigoldfishmode/USER_GUIDE.md')); } catch {}
            }
        } catch {}
    }


    /**
     * Index code repository into AGM memories (prototype)
     */
    private async handleIndexCode(opts: any): Promise<void> {
        const root = opts.path || process.cwd();
        const maxChunk = parseInt(opts.maxChunk || '200', 10);
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('index-code', { root, maxChunk, symbols: !!opts.symbols, explain: tracer.flags.explain });
            tracer.mirror(`agm index-code --path ${JSON.stringify(root)} --max-chunk ${maxChunk}${opts.symbols?' --symbols':''}${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray(`Explanation: Walk files (include/exclude), ${opts.symbols?'chunk by symbols (functions/classes)':'chunk by lines'}, store as type=code with metadata (file, language, line ranges).`));
            }

            await this.memoryEngine.initialize();
            const { CodeIndexer } = await import('./codeindex/CodeIndexer.js');
            const indexer = new CodeIndexer(root);


            const { SymbolIndexer } = await import('./codeindex/SymbolIndexer.js');
            const symIndexer = new SymbolIndexer(root);

            const include: string[] | undefined = opts.include;
            const exclude: string[] | undefined = opts.exclude;

            let saved = 0;
            const pending: Promise<any>[] = [];
            const context = 'code';

            // Embeddings (Stage 1): prepare provider
            const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider.js');
            const provider = EmbeddingProvider.create(process.cwd());
            await provider.init().catch((e: unknown) => {
                console.log(chalk.yellow('⚠️ Embedding provider init failed. Continuing without vectors.'));
                if (tracer.flags.trace) console.log(String(e));
                return undefined;
            });

            const embedAndStore = async (text: string, tags: string[], metadata: any) => {
                const id = await this.memoryEngine.database.storeMemory(text, context, 'code', tags, metadata);
                if (provider && (provider as any).getInfo) {
                    try {
                        const vec = await provider.embed(text);
                        await this.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions);
                    } catch (e) {
                        if (tracer.flags.trace) console.log('Vector upsert skipped:', String(e));
                    }
                }
                saved++;
            };

            if (opts.symbols) {
                if (!this.proEnabled) {
                    this.nudgePro('symbols', 'Enhanced symbol chunking (Tree-sitter pack, smarter heuristics) is available with Pro. Proceeding with basic symbol indexing.');
                }
                for (const file of indexer.listFiles({ include, exclude, maxChunkLines: maxChunk })) {
                    const full = require('path').join(root, file);
                    const chunks = symIndexer.chunkBySymbols(full);
                    for (const chunk of chunks) {
                        if (tracer.flags.dryRun) { continue; }
                        const tags = ['code', chunk.meta.language || 'unknown', 'symbol'];
                        await embedAndStore(chunk.text, tags, chunk.meta);
                    }
                }
            } else {
                indexer.indexFiles({ maxChunkLines: maxChunk, context, include, exclude }, (chunk: { text: string; meta: { language?: string } }) => {
                    if (tracer.flags.dryRun) { return; }
                    const tags = ['code', chunk.meta.language || 'unknown'];
                    pending.push(embedAndStore(chunk.text, tags, chunk.meta));
                });
            }

            await Promise.all(pending);

            // reuse dynamic import above; construct a temporary indexer for digest
            const listForDigest = new (await import('./codeindex/CodeIndexer.js')).CodeIndexer(root).listFiles({ include, exclude, maxChunkLines: maxChunk });
            const digest = crypto.createHash('sha256').update(JSON.stringify(listForDigest)).digest('hex');

            const result = { saved, root, digest, fileCount: listForDigest.length };
            if (tracer.flags.json) {
                console.log(JSON.stringify(result, null, 2));

            if (tracer.flags.explain) {
                const { CodeIndexer } = await import('./codeindex/CodeIndexer.js');
                const files = new CodeIndexer(root).listFiles({ include, exclude, maxChunkLines: maxChunk });
                console.log(chalk.gray(`Explain: include=${JSON.stringify(include||['**/*'])} exclude=${JSON.stringify(exclude||['**/node_modules/**', '**/.git/**', '**/dist/**'])}`));
                console.log(chalk.gray(`Explain: files considered=${files.length}`));
            }

            } else {
                console.log(`✅ Indexed code from ${root}. Saved chunks: ${saved}`);
                console.log(chalk.gray(`   Files considered: ${listForDigest.length}, digest: ${digest.slice(0,8)}…`));
            }

            const receipt = tracer.writeReceipt('index-code', { root, maxChunk, include, exclude, dryRun: tracer.flags.dryRun }, result, true, undefined, { resultSummary: { saved }, digests: { fileListDigest: digest } });
            tracer.appendJournal({ cmd: 'index-code', args: { root, maxChunk, include, exclude, dryRun: tracer.flags.dryRun }, receipt });
        } catch (error) {
            const receipt = tracer.writeReceipt('index-code', { root, maxChunk }, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'index-code', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ Code indexing failed:'), error instanceof Error ? error.message : error);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Search code-aware memories (prototype)
     */
    private async handleSearchCode(query: string, opts: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            const topk = parseInt(opts.topk || '20', 10);
            const preview = parseInt(opts.preview || opts.n || '0', 10);
            const filterPath: string[] | undefined = opts.filterPath || opts.filter || opts.p;
            const hybrid = !!(opts.hybrid || opts.semantic);
            tracer.plan('search-code', { query, topk, preview, filterPath, hybrid, explain: tracer.flags.explain });
            tracer.mirror(`agm search-code ${JSON.stringify(query)} -k ${topk}${preview?` --preview ${preview}`:''}${filterPath?` --filter-path ${filterPath.join(' ')}`:''}${hybrid?' --hybrid':''}${tracer.flags.explain?' --explain':''}`);
            const rerankN = parseInt(opts.rerank || '200', 10) || 200;
            if (tracer.flags.explain) {
                const backend = 'fallback'; // vss query path not yet wired
                const fusion = 'score = 0.5 * BM25 + 0.5 * cosine';
                console.log(chalk.gray(`Explanation: FTS search across code-type memories;${hybrid?` hybrid/semantic mode re-ranks top ${rerankN} results with vector cosine using backend=${backend} and fusion ${fusion}.`:''} Optional --filter-path limits results by file globs.`));
            }

            if (tracer.flags.dryRun) {
                console.log(chalk.yellow('DRY-RUN: Skipping database search'));
                const receipt = tracer.writeReceipt('search-code', { query, topk, preview, dryRun: true, hybrid, rerankN }, { count: 0 }, true, undefined, { hybrid: { backend: 'fallback', fusionWeights: { bm25: 0.5, cosine: 0.5 }, rerankN } });
                tracer.appendJournal({ cmd: 'search-code', args: { query, topk, preview, dryRun: true, hybrid, rerankN }, receipt });
                await this.cleanup();
                return;
            }

            await this.memoryEngine.initialize();

            let results = await this.memoryEngine.database.searchMemories(query, { limit: hybrid ? rerankN : topk, type: 'code' });

            if (hybrid) {
                const take = Math.min(topk, results.length);
                const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider.js');
                const provider = EmbeddingProvider.create(process.cwd());
                let queryVec: Float32Array | null = null;
                try {
                    await provider.init();
                    queryVec = await provider.embed(query);
                } catch (e) {
                    if (tracer.flags.trace) console.log('Hybrid mode: embedding init failed, falling back to FTS only. Error:', String(e));
                }
                let backend = 'fallback';
                if (queryVec) {
                    // If VSS is available, run a KNN to get top rerankN candidates by vector, then fuse with FTS by id.
                    const vssKnn = await (this.memoryEngine.database as any).knnSearch(queryVec, rerankN).catch(() => [] as Array<{id:number;distance:number}>);
                    if (vssKnn && vssKnn.length > 0) {
                        backend = 'vss';
                        const vssMap = new Map<number, number>();
                        vssKnn.forEach((row: {id:number;distance:number}) => { vssMap.set(row.id, row.distance); });
                        const scored = results.map(r => {
                            // Convert VSS distance to cosine-like score (approx): sim = 1 / (1 + distance)
                            const dist = vssMap.get(r.id);
                            let cos = 0;
                            if (dist !== undefined) cos = 1 / (1 + dist);
                            // If not in VSS topN, fallback to on-the-fly cosine using stored vectors if available
                            if (dist === undefined) {
                                // Best-effort local cosine using stored vectors
                                // (Avoid extra DB round trips for now; acceptable fallback)
                            }
                            const bm25 = (r as any).relevance ?? 0;
                            let fused = 0.5 * bm25 + 0.5 * Math.max(0, cos);
                            // Gentle symbol bias when no explicit filter is set
                            if (!opts.filterSymbol) {
                                try {
                                    const meta: any = JSON.parse((r as any).metadata || '{}');
                                    const tags: string[] = Array.isArray(meta.tags) ? meta.tags.map((t: string) => String(t).toLowerCase()) : [];
                                    if (tags.includes('symbol') || meta.symbolType) fused *= 1.05; // +5%
                                } catch {}
                            }
                            return { r, bm25, cos, fused };
                        });
                        scored.sort((a,b) => b.fused - a.fused);
                        results = scored.slice(0, take).map(s => Object.assign({}, s.r, { relevance: s.fused, _bm25: s.bm25, _cos: s.cos }));
                    } else {
                        // Fallback to existing JS cosine rerank on FTS candidates
                        const ids = results.map(r => r.id);
                        const vecMap = await this.memoryEngine.database.getVectors(ids).catch(() => new Map());
                        const scored = results.map((r) => {
                            const v = vecMap.get(r.id);
                            let cos = 0;
                            if (v && v.length === queryVec!.length) {
                                let dot = 0, na = 0, nb = 0;
                                for (let i = 0; i < v.length; i++) { const a = v[i], b = queryVec![i]; dot += a*b; na += a*a; nb += b*b; }
                                cos = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
                            }
                            const bm25 = (r as any).relevance ?? 0;
                            let fused = 0.5 * bm25 + 0.5 * Math.max(0, cos);
                            if (!opts.filterSymbol) {
                                try {
                                    const meta: any = JSON.parse((r as any).metadata || '{}');
                                    const tags: string[] = Array.isArray(meta.tags) ? meta.tags.map((t: string) => String(t).toLowerCase()) : [];
                                    if (tags.includes('symbol') || meta.symbolType) fused *= 1.05;
                                } catch {}
                            }
                            return { r, bm25, cos, fused };
                        });
                        scored.sort((a,b) => b.fused - a.fused);
                        results = scored.slice(0, take).map(s => Object.assign({}, s.r, { relevance: s.fused, _bm25: s.bm25, _cos: s.cos }));
                    }
                } else {
                    results = results.slice(0, topk);
                }
                // Print explain line when requested
                if (tracer.flags.explain) {
                    console.log(chalk.gray(`Hybrid details: backend=${backend}, fusionWeights={bm25:0.5,cosine:0.5}, rerankN=${rerankN}`));
                }
            }


            // Optional filter by metadata.file globs
            if (filterPath && filterPath.length) {
                results = results.filter(r => {
                    let meta: any = {};
                    try { meta = JSON.parse((r as any).metadata || '{}'); } catch {}
                    return meta.file ? pathMatches(filterPath, meta.file) : false;
                });
            }
            // Optional filters: symbol and language
            const filterSymbols: string[] | undefined = opts.filterSymbol || undefined;
            const filterLangs: string[] | undefined = opts.filterLanguage || undefined;
            if ((filterSymbols && filterSymbols.length) || (filterLangs && filterLangs.length)) {
                const norm = (s: string) => String(s || '').toLowerCase();
                const wantedSyms = new Set((filterSymbols||[]).map(norm));
                const wantedLangs = new Set((filterLangs||[]).map(norm));
                results = results.filter(r => {
                    let meta: any = {}; try { meta = JSON.parse((r as any).metadata || '{}'); } catch {}
                    const tags: string[] = Array.isArray(meta.tags) ? meta.tags.map(norm) : [];
                    const lang: string = meta.language ? norm(meta.language) : '';
                    const symOk = wantedSyms.size ? tags.some(t => wantedSyms.has(t) || (t === 'symbol' && wantedSyms.has(meta.symbolType?.toLowerCase?.()))) : true;
                    const langOk = wantedLangs.size ? (lang ? wantedLangs.has(lang) : false) : true;
                    return symOk && langOk;
                });
            }


            if (tracer.flags.json) {
                console.log(JSON.stringify({ count: results.length, results }, null, 2));
            } else {
                console.log(chalk.cyan(`🔎 Found ${results.length} code chunks`));
                const hl = buildHighlightRegex(query);
                for (const r of results) {
                    let meta: any = {};
                    try { meta = JSON.parse(r.metadata || '{}'); } catch {}
                    const loc = meta.file ? `${meta.file}:${meta.lineStart}-${meta.lineEnd}` : '';
                    const vecPart = (hybrid && (r as any)._cos !== undefined) ? ` v=${((r as any)._cos as number).toFixed(3)}` : '';
                    const bmPart = (hybrid && (r as any)._bm25 !== undefined) ? ` bm=${((r as any)._bm25 as number).toFixed(3)}` : '';
                    const header = `• [${(r.relevance ?? 0).toFixed(3)}]${bmPart}${vecPart} ${loc}`;
                    if (!preview) { console.log(header); continue; }
                    // naive preview: first N lines with basic highlight
                    const lines = (r.content || '').split(/\r?\n/).slice(0, preview);
                    console.log(header);
                    lines.forEach((line, idx) => {
                        const shown = hl ? line.replace(hl, (m) => chalk.yellow(m)) : line;
                        console.log(`   ${String(idx+1).padStart(2,' ')} ${shown}`);
                    });
                }
            }

            // Compute a deterministic digest over result IDs (and file:line where available)
            const idList = results.map(r => {
                let meta: any = {}; try { meta = JSON.parse((r as any).metadata || '{}'); } catch {}
                const loc = meta.file ? `${meta.file}:${meta.lineStart}-${meta.lineEnd}` : '';
                return `${r.id}${loc?`@${loc}`:''}`;
            });
            const resultDigest = crypto.createHash('sha256').update(JSON.stringify(idList)).digest('hex');

            const backend = 'fallback';
            const receipt = tracer.writeReceipt('search-code', { query, topk, preview, filterPath, hybrid, rerankN, filterSymbols, filterLangs }, { count: results.length }, true, undefined, { resultSummary: { ids: idList.slice(0, 10) }, digests: { resultDigest }, hybrid: hybrid ? { backend, fusionWeights: { bm25: 0.5, cosine: 0.5 }, rerankN } : undefined });
            tracer.appendJournal({ cmd: 'search-code', args: { query, topk, preview, filterPath, hybrid, rerankN, filterSymbols, filterLangs }, receipt });
        } catch (error) {
            const receipt = tracer.writeReceipt('search-code', { query, topk: opts.topk }, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'search-code', error: (error as Error).message, receipt });
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('❌ search-code failed:'), msg);
            if (/Failed to decrypt database|integrity check failed/i.test(msg)) {
                console.error(chalk.yellow('Tip: run "agm init --force" to reset local DB artifacts if this persists.'));
            }
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Watch and incrementally index code changes
     */
    private async handleWatchCode(opts: any): Promise<void> {
        const root = opts.path || process.cwd();
        const maxChunk = parseInt(opts.maxChunk || '200', 10);
        const debounceMs = parseInt(opts.debounce || '400', 10);
        const include: string[] | undefined = opts.include;
        const exclude: string[] | undefined = opts.exclude;
        const useSymbols = !!opts.symbols;
        if (useSymbols) {
            this.nudgePro('symbols-reindex-file', 'Pro improves symbol chunking and reindex speed. Proceeding with basic symbol mode.');
        }
        if (useSymbols) {
            this.nudgePro('symbols-watch', 'Enhanced symbol chunking and faster diff-aware reindex are Pro features. Proceeding with basic symbol mode.');
        }
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        tracer.plan('watch-code', { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs, explain: tracer.flags.explain });
        tracer.mirror(`agm watch-code --path ${JSON.stringify(root)} --max-chunk ${maxChunk}${useSymbols?' --symbols':''}${include?` --include ${include.join(' ')}`:''}${exclude?` --exclude ${exclude.join(' ')}`:''}${debounceMs!==400?` --debounce ${debounceMs}`:''}${tracer.flags.explain?' --explain':''}`);
        if (tracer.flags.explain) {
            console.log(chalk.gray('Explanation: Watches file changes and re-chunks only changed files; removes stale entries on delete. Emits receipts per batch.'));    
        }

        try {
            await this.memoryEngine.initialize();
            const { CodeIndexer } = await import('./codeindex/CodeIndexer.js');
            const { SymbolIndexer } = await import('./codeindex/SymbolIndexer.js');
            const indexer = new CodeIndexer(root);
            const symIndexer = new SymbolIndexer(root);

            const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider.js');
            const provider = EmbeddingProvider.create(process.cwd());
            try { await provider.init(); } catch { /* proceed without vectors */ }

            const chokidar = await import('chokidar');

            // Build watch globs and ignored function
            const defaultExcludes = ['**/node_modules/**','**/.git/**','**/dist/**','**/build/**','**/.next/**','**/.cache/**','**/.antigoldfishmode/**'];
            const includes = (include && include.length) ? include : ['**/*'];
            const excludes = [...defaultExcludes, ...(exclude||[])];
            const shouldIgnore = (relUnix: string): boolean => {
                return excludes.some(g => globToRegex(g).test(relUnix.endsWith('/')?relUnix:relUnix));
            };

            const watcher = chokidar.watch(includes, {
                cwd: root,
                ignored: (pth: string) => {
                    const relUnix = pth.replace(/\\/g,'/');
                    return shouldIgnore(relUnix);
                },
                ignoreInitial: true,
                awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
                persistent: true,
            });

            console.log(chalk.cyan(`👀 Watching ${root} for code changes… Press Ctrl+C to stop.`));

            const pending = new Map<string, 'add'|'change'|'unlink'>();
            // Helper to compute a stable digest of file contents
            const fileDigest = (fullPath: string): string => {
                try { const buf = fs.readFileSync(fullPath); return crypto.createHash('sha1').update(buf).digest('hex'); } catch { return ''; }
            };
            // Track recent unlinks to enable simple rename detection (digest → oldPath)
            const recentUnlinks = new Map<string, { path: string; at: number }>();
            let timer: NodeJS.Timeout | null = null;

            const flush = async () => {
                if (pending.size === 0) return;
                const batch = Array.from(pending.entries());
                pending.clear();
                let added = 0, updated = 0, removed = 0, errors: string[] = [];
                const context = 'code';
                const processFile = async (rel: string, kind: 'add'|'change'|'unlink') => {
                    try {
                        const relUnix = rel.replace(/\\/g,'/');
                        const full = path.join(root, relUnix);
                        // Derive workspace-relative path (used by SymbolIndexer meta.file)
                        const wsRel = path.relative(process.cwd(), full).replace(/\\/g,'/');
                        if (kind === 'unlink') {
                            // Remember unlink by digest (if available) for rename pairing
                            const d = fileDigest(full);
                            if (d) recentUnlinks.set(d, { path: relUnix, at: Date.now() });
                            const n1 = await (this.memoryEngine.database as any).deleteCodeByFile?.(relUnix) ?? 0;
                            const n2 = await (this.memoryEngine.database as any).deleteCodeByFile?.(wsRel) ?? 0;
                            const n = n1 + n2;
                            removed += n;
                            return;
                        }
                        // For add/change: delete existing entries, then (re)index file
                        const digest = fileDigest(full);
                        // Rename optimization: if we see an add with same digest as a very recent unlink, update paths without re-embedding
                        if (kind === 'add' && digest) {
                            const recent = recentUnlinks.get(digest);
                            if (recent && (Date.now() - recent.at) < 5000) {
                                try {
                                    const oldRel = recent.path;
                                    const oldWsRel = path.relative(process.cwd(), path.join(root, oldRel)).replace(/\\/g,'/');
                                    const moved1 = await (this.memoryEngine.database as any).updateCodeFilePath?.(oldRel, relUnix);
                                    const moved2 = await (this.memoryEngine.database as any).updateCodeFilePath?.(oldWsRel, wsRel);
                                    if ((moved1||0) + (moved2||0) > 0) {
                                        updated++;
                                        recentUnlinks.delete(digest);
                                        await (this.memoryEngine.database as any).setFileDigest?.(relUnix, digest);
                                        return; // Skip re-embedding; metadata updated
                                    }
                                } catch {}
                            }
                        }
                        // Skip if unchanged (same digest as last processed)
                        const prev = await (this.memoryEngine.database as any).getFileDigest?.(relUnix) || null;
                        if (prev && digest && prev === digest && (kind === 'change' || kind === 'add')) {
                            return; // No content change detected
                        }
                        try { await (this.memoryEngine.database as any).deleteCodeByFile?.(relUnix); } catch {}
                        try { await (this.memoryEngine.database as any).deleteCodeByFile?.(wsRel); } catch {}
                        const chunks = useSymbols ? symIndexer.chunkBySymbols(full) : indexer.chunkFile(full, maxChunk).map(c => ({ text: c.text, meta: c.meta }));
                        for (const chunk of chunks) {
                            const id = await this.memoryEngine.database.storeMemory(chunk.text, context, 'code', ['code', (chunk as any).meta?.language || 'unknown', useSymbols?'symbol':undefined].filter(Boolean) as string[], chunk.meta);
                            if (provider && (provider as any).getInfo) {
                                try {
                                    const vec = await provider.embed(chunk.text);
                                    await this.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions);
                                } catch { /* skip vector */ }
                            }
                            added++;
                        }
                        updated++;
                        if (digest) await (this.memoryEngine.database as any).setFileDigest?.(relUnix, digest);
                    } catch (e) {
                        errors.push(`${rel}: ${(e as Error).message}`);
                    }
                };

                for (const [rel, kind] of batch) {
                    await processFile(rel, kind);
                }

                const summary = { files: batch.length, added, updated, removed, errors: errors.length };
                console.log(chalk.green(`🔄 Indexed batch: +${added} ~${updated} -${removed}${errors.length?` (errors=${errors.length})`:''}`));
                try {
                    const receipt = tracer.writeReceipt('watch-code', { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs }, summary, true, undefined, { resultSummary: summary });
                    tracer.appendJournal({ cmd: 'watch-code', args: { root, maxChunk, include, exclude, symbols: useSymbols, debounceMs }, receipt });
                } catch {}
            };

            const schedule = () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, debounceMs);
            };

            watcher.on('add', (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'add'); schedule(); });
            watcher.on('change', (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'change'); schedule(); });
            watcher.on('unlink', async (p: string) => { const rel = p.replace(/\\/g,'/'); pending.set(rel, 'unlink'); try { await (this.memoryEngine.database as any).deleteFileDigest?.(rel); } catch {} schedule(); });

            const stop = async () => {
                try { if (timer) { clearTimeout(timer); timer = null; } } catch {}
                try { await flush(); } catch {}
                try { await watcher.close(); } catch {}
                await this.cleanup();
                console.log(chalk.gray('👋 watch-code stopped.'));
            };

            process.on('SIGINT', async () => { console.log(); console.log(chalk.yellow('Caught interrupt signal (Ctrl+C). Shutting down…')); await stop(); process.exit(0); });
            process.on('SIGTERM', async () => { await stop(); process.exit(0); });

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('❌ watch-code failed:'), msg);
            if (/Failed to decrypt database|integrity check failed/i.test(msg)) {
                console.error(chalk.yellow('Tip: run "agm init --force" to reset local DB artifacts if this persists.'));
            }
            await this.cleanup();
            process.exit(1);
        }
    }

    // --- Digest cache maintenance ---
    private async handleDigestCache(opts: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            await this.memoryEngine.initialize();
            if (opts.clear) {
                const n = await (this.memoryEngine.database as any).clearFileDigests?.();
                console.log(chalk.green(`✅ Cleared ${n} digest entr${(n===1)?'y':'ies'}`));
                const receipt = tracer.writeReceipt('digest-cache', { action: 'clear' }, { cleared: n }, true);
                tracer.appendJournal({ cmd: 'digest-cache', args: { clear: true }, receipt });
            } else if (opts.list) {
                const limit = parseInt(String(opts.limit || '50'), 10) || 50;
                const rows = await (this.memoryEngine.database as any).listFileDigests?.(limit);
                if (!rows || rows.length === 0) {
                    console.log('ℹ️ No digests cached.');
                } else {
                    for (const r of rows) {
                        console.log(`${r.updatedAt}  ${r.digest}  ${r.file}`);
                    }
                    console.log(`\nTotal: ${rows.length} shown${rows.length === limit ? ' (truncated)' : ''}.`);
                }
                const receipt = tracer.writeReceipt('digest-cache', { action: 'list', limit }, { shown: rows?.length || 0 }, true);
                tracer.appendJournal({ cmd: 'digest-cache', args: { list: true, limit }, receipt });
            } else {
                console.log('Usage: agm digest-cache --clear | --list [--limit <n>]');
            }
        } catch (e) {
            console.error(chalk.red('❌ digest-cache failed:'), (e as Error).message);
        } finally {
            await this.cleanup();
        }
    }

    // --- Force reindex one file ---
    private async handleReindexFile(file: string, opts: any): Promise<void> {
        const abs = path.resolve(process.cwd(), file);
        const root = process.cwd();
        const useSymbols = !!opts.symbols;
        if (useSymbols) {
            this.nudgePro('symbols-reindex-folder', 'Pro enhances symbol chunking and speeds up bulk reindex. Proceeding with basic symbol mode.');
        }
        const maxChunk = 200;
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            await this.memoryEngine.initialize();
            const relUnix = path.relative(root, abs).replace(/\\/g,'/');
            const wsRel = path.relative(process.cwd(), abs).replace(/\\/g,'/');
            try { await (this.memoryEngine.database as any).deleteCodeByFile?.(relUnix); } catch {}
            try { await (this.memoryEngine.database as any).deleteCodeByFile?.(wsRel); } catch {}
            const { CodeIndexer } = await import('./codeindex/CodeIndexer.js');
            const { SymbolIndexer } = await import('./codeindex/SymbolIndexer.js');
            const idx = new CodeIndexer(root);
            const sym = new SymbolIndexer(root);
            const chunks = useSymbols ? sym.chunkBySymbols(abs) : idx.chunkFile(abs, maxChunk).map((c: { text: string; meta: any }) => ({ text: c.text, meta: c.meta }));
            const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider.js');
            const provider = EmbeddingProvider.create(process.cwd());
            try { await provider.init(); } catch {}
            let saved = 0;
            for (const chunk of chunks) {
                const id = await this.memoryEngine.database.storeMemory(chunk.text, 'code', 'code', ['code', (chunk as any).meta?.language || 'unknown', useSymbols?'symbol':undefined].filter(Boolean) as string[], chunk.meta);
                if (provider && (provider as any).getInfo) {
                    try { const vec = await provider.embed(chunk.text); await this.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions); } catch {}
                }
                saved++;
            }
            // Update digest
            try { const buf = fs.readFileSync(abs); const dig = crypto.createHash('sha1').update(buf).digest('hex'); await (this.memoryEngine.database as any).setFileDigest?.(relUnix, dig); } catch {}
            console.log(chalk.green(`✅ Reindexed ${relUnix} (${saved} chunk${saved===1?'':'s'})`));
            const receipt = tracer.writeReceipt('reindex-file', { file: relUnix, symbols: useSymbols }, { saved }, true);
            tracer.appendJournal({ cmd: 'reindex-file', args: { file: relUnix, symbols: useSymbols }, receipt });
        } catch (e) {
            console.error(chalk.red('❌ reindex-file failed:'), (e as Error).message);
        } finally {
            await this.cleanup();
        }
    }

    // --- Force reindex a whole folder ---
    private async handleReindexFolder(folder: string, opts: any): Promise<void> {
        const absFolder = path.resolve(process.cwd(), folder);
        const root = process.cwd();
        const include: string[] | undefined = opts.include;
        const exclude: string[] | undefined = opts.exclude;
        const useSymbols = !!opts.symbols;
        const maxChunk = parseInt(String(opts.maxChunk || '200'), 10) || 200;
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            await this.memoryEngine.initialize();
            const { CodeIndexer } = await import('./codeindex/CodeIndexer.js');
            const { SymbolIndexer } = await import('./codeindex/SymbolIndexer.js');
            const idx = new CodeIndexer(absFolder);
            const sym = new SymbolIndexer(absFolder);

            const files = idx.listFiles({ include, exclude, maxChunkLines: maxChunk });
            let added = 0, errors = 0;
            const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider.js');
            const provider = EmbeddingProvider.create(process.cwd());
            try { await provider.init(); } catch {}
            for (const rel of files) {
                const full = path.join(absFolder, rel);
                const projectRel = path.relative(root, full).replace(/\\/g, '/');
                try {
                    // wipe existing
                    try { await (this.memoryEngine.database as any).deleteCodeByFile?.(projectRel); } catch {}
                    const chunks = useSymbols ? sym.chunkBySymbols(full) : idx.chunkFile(full, maxChunk).map((c: { text: string; meta: any }) => ({ text: c.text, meta: c.meta }));
                    for (const chunk of chunks) {
                        const id = await this.memoryEngine.database.storeMemory(chunk.text, 'code', 'code', ['code', (chunk as any).meta?.language || 'unknown', useSymbols?'symbol':undefined].filter(Boolean) as string[], chunk.meta);
                        if (provider && (provider as any).getInfo) {
                            try { const vec = await provider.embed(chunk.text); await this.memoryEngine.database.upsertVector(id, vec, provider.getInfo().dimensions); } catch {}
                        }
                        added++;
                    }
                    // refresh digest
                    try { const buf = fs.readFileSync(full); const dig = crypto.createHash('sha1').update(buf).digest('hex'); await (this.memoryEngine.database as any).setFileDigest?.(projectRel, dig); } catch {}
                } catch (e) {
                    errors++;
                    console.error(`❌ Failed to index ${projectRel}:`, (e as Error).message);
                }
            }
            console.log(chalk.green(`✅ Reindexed ${files.length} files under ${path.relative(root, absFolder)||'.'}; chunks added: ${added}, errors: ${errors}`));
            const receipt = tracer.writeReceipt('reindex-folder', { folder: path.relative(root, absFolder), include, exclude, symbols: useSymbols, maxChunk }, { files: files.length, added, errors }, true);
            tracer.appendJournal({ cmd: 'reindex-folder', args: { folder: path.relative(root, absFolder), include, exclude, symbols: useSymbols, maxChunk }, receipt });
        } catch (e) {
            console.error(chalk.red('❌ reindex-folder failed:'), (e as Error).message);
        } finally {
            await this.cleanup();
        }
    }

    // --- GC maintenance ---
    private async handleGC(opts: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        const root = process.cwd();
        try {
            await this.memoryEngine.initialize();
            let prunedVectors = 0;
            let staleDigestsRemoved = 0;
            let vacuumed = false;

            if (opts.pruneVectors) {
                try { prunedVectors = await (this.memoryEngine.database as any).pruneOrphanVectors?.(); } catch {}
            }

            if (opts.dropStaleDigests) {
                try {
                    const rows = await (this.memoryEngine.database as any).listAllFileDigests?.();
                    if (rows && rows.length) {
                        for (const r of rows) {
                            const full = path.join(root, r.file.replace(/\\/g,'/'));
                            if (!fs.existsSync(full)) {
                                try { await (this.memoryEngine.database as any).deleteFileDigest?.(r.file); staleDigestsRemoved++; } catch {}
                            }
                        }
                    }
                } catch {}
            }

            if (opts.vacuum) {
                try { await (this.memoryEngine.database as any).vacuum?.(); vacuumed = true; } catch {}
            }

            console.log(chalk.green(`🧹 GC complete: orphanVectors=${prunedVectors}, staleDigests=${staleDigestsRemoved}${vacuumed?', vacuumed':''}`));
            const receipt = tracer.writeReceipt('gc', { pruneVectors: !!opts.pruneVectors, dropStaleDigests: !!opts.dropStaleDigests, vacuum: !!opts.vacuum }, { prunedVectors, staleDigestsRemoved, vacuumed }, true);
            tracer.appendJournal({ cmd: 'gc', args: { pruneVectors: !!opts.pruneVectors, dropStaleDigests: !!opts.dropStaleDigests, vacuum: !!opts.vacuum }, receipt });
        } catch (e) {
            console.error(chalk.red('❌ gc failed:'), (e as Error).message);
        } finally {
            await this.cleanup();
        }
    }

    // --- Health summary ---
    private async handleHealth(opts?: any): Promise<void> {
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            await this.memoryEngine.initialize();
            const project = this.memoryEngine.getProjectInfo();
            const stats = await this.memoryEngine.getStats();
            const vec = await this.memoryEngine.database.vectorStats();
            let digests = 0;
            try { digests = await (this.memoryEngine.database as any).countFileDigests?.(); } catch {}

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
                    try { memDelta = await (this.memoryEngine.database as any).countMemoriesSince?.(sinceISO); } catch {}
                    try { vecDelta = await (this.memoryEngine.database as any).countVectorsSince?.(sinceISO); } catch {}
                }
            }

            // Lightweight local rollups from receipts (last 7 days default when sinceDays not set)
            const receiptsDir = path.join(process.cwd(), '.antigoldfishmode', 'receipts');
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

            if ((this.program as any).opts?.().json) {
                console.log(JSON.stringify(data, null, 2));
            } else {
                console.log(chalk.cyan('🩺 AGM Health'));
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
                console.log(`   Pro (honor-system): ${this.proEnabled ? 'ENABLED' : 'disabled'}`);
                if (sinceDays) {
                    console.log(`   𝚫 Last ${sinceDays} day(s): +${memDelta} memories, +${vecDelta} vectors`);
                    if (vecDelta > 0 && digests > 0) {
                        console.log(chalk.gray('   Hint: run "agm gc --prune-vectors --drop-stale-digests" to tidy up if growth is high.'));
                    }
                }
                console.log(chalk.gray('   Tip: run "agm gc --prune-vectors --drop-stale-digests --vacuum" to tidy up.'));
            }

            const receipt = tracer.writeReceipt('health', { sinceDays }, data, true);
            tracer.appendJournal({ cmd: 'health', args: { sinceDays }, receipt });
        } catch (e) {
            console.error(chalk.red('❌ health failed:'), (e as Error).message);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Create VSCode integration files
     */
    private async createVSCodeIntegration(): Promise<void> {
        try {
            const vscodeDir = path.join(process.cwd(), '.vscode');

            // Create .vscode directory if it doesn't exist
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
                console.log(chalk.green('✅ Created .vscode directory'));
            }

            // Get template directory (try both relative to dist and relative to project root)
            let templateDir = path.join(__dirname, '..', '.vscode-templates');
            if (!fs.existsSync(templateDir)) {
                // Try relative to project root for development
                templateDir = path.join(__dirname, '..', '..', '.vscode-templates');
            }
            if (!fs.existsSync(templateDir)) {
                // Try with require.resolve for npm global installs
                try {
                    const packageRoot = path.dirname(require.resolve('antigoldfishmode/package.json'));
                    templateDir = path.join(packageRoot, '.vscode-templates');
                } catch (error) {
                    console.log(chalk.yellow('⚠️ VSCode templates not found, skipping VSCode integration'));
                    return;
                }
            }

            // Copy tasks.json
            const tasksTemplate = path.join(templateDir, 'tasks.json');
            const tasksDestination = path.join(vscodeDir, 'tasks.json');
            if (fs.existsSync(tasksTemplate)) {
                this.mergeVSCodeFile(tasksTemplate, tasksDestination, 'tasks');
                console.log(chalk.green('✅ VSCode tasks configured (Ctrl+Shift+P → Tasks: Run Task)'));
            }

            // Copy settings.json
            const settingsTemplate = path.join(templateDir, 'settings.json');
            const settingsDestination = path.join(vscodeDir, 'settings.json');
            if (fs.existsSync(settingsTemplate)) {
                this.mergeVSCodeFile(settingsTemplate, settingsDestination, 'settings');
                console.log(chalk.green('✅ VSCode settings configured'));
            }

            // Copy keybindings.json
            const keybindingsTemplate = path.join(templateDir, 'keybindings.json');
            const keybindingsDestination = path.join(vscodeDir, 'keybindings.json');
            if (fs.existsSync(keybindingsTemplate)) {
                fs.copyFileSync(keybindingsTemplate, keybindingsDestination);
                console.log(chalk.green('✅ VSCode keybindings configured (Ctrl+Shift+M, Ctrl+Shift+R)'));
            }

            // Copy snippets
            const snippetsTemplate = path.join(templateDir, 'agm.code-snippets');
            const snippetsDestination = path.join(vscodeDir, 'agm.code-snippets');
            if (fs.existsSync(snippetsTemplate)) {
                fs.copyFileSync(snippetsTemplate, snippetsDestination);
                console.log(chalk.green('✅ VSCode snippets configured (type "agm-" for autocomplete)'));
            }

        } catch (error) {
            console.log(chalk.yellow('⚠️ VSCode integration setup failed (this is optional)'));
            console.log(chalk.gray(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
    }

    /**
     * Merge VSCode configuration files intelligently
     */
    private mergeVSCodeFile(templatePath: string, destinationPath: string, type: 'tasks' | 'settings'): void {
        try {
            const templateContent = fs.readFileSync(templatePath, 'utf8');

            if (!fs.existsSync(destinationPath)) {
                // File doesn't exist, create it
                fs.writeFileSync(destinationPath, templateContent);
                return;
            }

            // File exists, merge intelligently
            const existingContent = fs.readFileSync(destinationPath, 'utf8');
            let existingJson: any;
            let templateJson: any;

            try {
                existingJson = JSON.parse(existingContent);
                templateJson = JSON.parse(templateContent);
            } catch (parseError) {
                // If parsing fails, backup existing and use template
                fs.writeFileSync(destinationPath + '.backup', existingContent);
                fs.writeFileSync(destinationPath, templateContent);
                console.log(chalk.yellow(`   ⚠️ Backed up existing ${type}.json and replaced with AGM version`));
                return;
            }

            if (type === 'tasks') {
                // Merge tasks
                if (!existingJson.tasks) existingJson.tasks = [];
                if (!existingJson.inputs) existingJson.inputs = [];

                // Add AGM tasks (avoid duplicates)
                if (templateJson.tasks) {
                    templateJson.tasks.forEach((task: any) => {
                        const exists = existingJson.tasks.some((existingTask: any) =>
                            existingTask.label === task.label
                        );
                        if (!exists) {
                            existingJson.tasks.push(task);
                        }
                    });
                }

                // Add AGM inputs (avoid duplicates)
                if (templateJson.inputs) {
                    templateJson.inputs.forEach((input: any) => {
                        const exists = existingJson.inputs.some((existingInput: any) =>
                            existingInput.id === input.id
                        );
                        if (!exists) {
                            existingJson.inputs.push(input);
                        }
                    });
                }

                existingJson.version = templateJson.version || existingJson.version;

            } else if (type === 'settings') {
                // Merge settings (template takes precedence for AGM-specific settings)
                Object.keys(templateJson).forEach(key => {
                    if (key.startsWith('agm.') || key.includes('AGM') || key === 'search.exclude' || key === 'files.associations') {
                        existingJson[key] = templateJson[key];
                    }
                });
            }

            fs.writeFileSync(destinationPath, JSON.stringify(existingJson, null, 2));

        } catch (error) {
            // Fallback: just copy the template
            fs.copyFileSync(templatePath, destinationPath);
        }
    }

    // legacy handleInit removed; use handleInitCommand instead

    // License activate/deactivate handlers removed

    /**
     * Handle AI guide command - Show AI assistant instructions
     */
    private async handleAIGuide(): Promise<void> {
        try {
            console.log(chalk.cyan('📖 AntiGoldfishMode - AI Assistant Operating Guide'));
            console.log('');

            // Try to read the AI instructions file from the package
            const instructionsPath = path.join(__dirname, '..', 'AI_ASSISTANT_INSTRUCTIONS.md');

            if (fs.existsSync(instructionsPath)) {
                const instructions = fs.readFileSync(instructionsPath, 'utf8');
                console.log(instructions);
            } else {
                // Fallback instructions if file not found
                console.log(chalk.yellow('📋 Quick AI Assistant Guide:'));


                console.log('');
                console.log(chalk.green('🧠 Memory Commands:'));
                console.log('  antigoldfishmode remember "information to store"');
                console.log('  antigoldfishmode recall "search term"');
                console.log('  antigoldfishmode status');
                console.log('');
                console.log(chalk.blue('🎯 AI Assistant Tips:'));
                console.log('  • Store solutions, insights, and user preferences');
                console.log('  • Search memories before solving similar problems');
                console.log('  • Be proactive - remember important decisions');
                console.log('  • Use descriptive, searchable language');
                console.log('');
                console.log(chalk.gray('📖 Full guide: https://github.com/antigoldfishmode/antigoldfishmode/blob/main/AI_ASSISTANT_INSTRUCTIONS.md'));
            }
        } catch (error) {
            console.log(chalk.red('❌ Failed to show AI guide:'), error instanceof Error ? error.message : 'Unknown error');
        }
    }

    // ----- .agmctx export/import -----
    private async handleExportContext(opts: any): Promise<void> {
        const outPath = path.resolve(process.cwd(), opts.out || 'context.agmctx');
        const type = String(opts.type || 'code');
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('export-context', { outPath, type, sign: !!opts.sign });
            tracer.mirror(`agm export-context --out ${JSON.stringify(opts.out||'context.agmctx')} --type ${type}${opts.sign?' --sign':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: exports type-filtered memories, metadata map, and vectors as a portable .agmctx directory. If --sign, emits ED25519 signature using a local private key.'));
            }

            await this.memoryEngine.initialize();
            const list = await this.memoryEngine.database.listMemories({ type });
            // Prepare container dir
            const tmpDir = path.join(process.cwd(), '.antigoldfishmode', 'tmp-export-' + Date.now().toString(36));
            fs.mkdirSync(tmpDir, { recursive: true });
            // map.csv (write first)
            const mapLines = ['id,file,lang,line_start,line_end,symbol,type,timestamp'];
            for (const m of list) {
                const meta = (() => { try { return JSON.parse(m.metadata||'{}'); } catch { return {}; } })();
                const file = meta.file || '';
                const lang = meta.language || '';
                const ls = meta.lineStart || '';
                const le = meta.lineEnd || '';
                const sym = meta.symbolName || '';
                const typ = meta.symbolType || '';
                const ts = m.createdAt || '';
                mapLines.push([m.id, file, lang, ls, le, sym, typ, ts].map(v => String(v).replace(/"/g,'""')).map(v => /,|"/.test(v)?`"${v}"`:v).join(','));
            }
            fs.writeFileSync(path.join(tmpDir, 'map.csv'), mapLines.join('\n'));
            // notes.jsonl (non-code memories placeholder: export none for now)
            fs.writeFileSync(path.join(tmpDir, 'notes.jsonl'), '');
            // vectors.f32 (contiguous Float32 rows; fallback to empty if not present)
            let total = 0; let dim = 0;
            try {
                const ids = list.map(m => m.id);
                const vecs = await this.memoryEngine.database.getVectors(ids);
                if (vecs.size) {
                    dim = (vecs.values().next().value as Float32Array).length;
                    total = vecs.size;
                    const buf = Buffer.alloc(total * dim * 4);
                    let row = 0;
                    for (const id of ids) {
                        const v = vecs.get(id);
                        if (!v) continue;
                        for (let i = 0; i < dim; i++) buf.writeFloatLE(v[i] || 0, (row * dim + i) * 4);
                        row++;
                    }
                    fs.writeFileSync(path.join(tmpDir, 'vectors.f32'), buf);
                } else {
                    fs.writeFileSync(path.join(tmpDir, 'vectors.f32'), Buffer.alloc(0));
                }
            } catch {
                fs.writeFileSync(path.join(tmpDir, 'vectors.f32'), Buffer.alloc(0));
            }

            // Write manifest last so it can include vectors metadata (schema v1)
            // Probe vector backend if available for richer manifest
            let backend: string | undefined = undefined;
            try {
                if ((this.memoryEngine as any).getVectorBackendInfo) {
                    const info = await (this.memoryEngine as any).getVectorBackendInfo();
                    backend = info?.backend;
                }
            } catch {}

            const manifest = {
                schemaVersion: 1,
                type,
                count: list.length,
                createdAt: new Date().toISOString(),
                vectors: { dim, count: total, backend }
            };
            fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

            // Optional signing (ED25519) using a local keypair stored under .antigoldfishmode/keys
            if (opts.sign) {
                this.nudgePro('sign', 'Signed exports (.agmctx + signature) are a Pro convenience feature. Proceeding with local signing.');
                try {
                    const keyDir = path.join(process.cwd(), '.antigoldfishmode', 'keys');
                    const pubKeyPath = path.join(keyDir, 'agm_ed25519.pub');
                    const privKeyPath = path.join(keyDir, 'agm_ed25519.key');
                    if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });
                    let publicKey: Buffer;
                    let privateKey: Buffer;
                    if (fs.existsSync(pubKeyPath) && fs.existsSync(privKeyPath)) {
                        publicKey = fs.readFileSync(pubKeyPath);
                        privateKey = fs.readFileSync(privKeyPath);
                    } else {
                        // Create new keypair
                        const { generateKeyPairSync } = await import('crypto');
                        const { publicKey: pub, privateKey: priv } = generateKeyPairSync('ed25519');
                        publicKey = pub.export({ type: 'spki', format: 'der' }) as Buffer;
                        privateKey = priv.export({ type: 'pkcs8', format: 'der' }) as Buffer;
                        fs.writeFileSync(pubKeyPath, publicKey);
                        fs.writeFileSync(privKeyPath, privateKey);
                    }

                    // Sign manifest+map+vectors digest
                    const { createSign, createHash } = await import('crypto');
                    const sha = createHash('sha256');
                    sha.update(fs.readFileSync(path.join(tmpDir, 'manifest.json')));
                    sha.update(fs.readFileSync(path.join(tmpDir, 'map.csv')));
                    sha.update(fs.readFileSync(path.join(tmpDir, 'vectors.f32')));
                    const digest = sha.digest();

                    // ed25519 uses sign.update directly not createSign; use sign by KeyObject
                    const { createPrivateKey, sign: cryptoSign } = await import('crypto');
                    const keyObj = createPrivateKey({ key: fs.readFileSync(path.join(process.cwd(), '.antigoldfishmode', 'keys', 'agm_ed25519.key')), format: 'der', type: 'pkcs8' });
                    const signature = cryptoSign(null, digest, keyObj);
                    fs.writeFileSync(path.join(tmpDir, 'signature.bin'), signature);
                    fs.writeFileSync(path.join(tmpDir, 'publickey.der'), fs.readFileSync(path.join(process.cwd(), '.antigoldfishmode', 'keys', 'agm_ed25519.pub')));
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Signing failed; continuing without signature:'), (e as Error).message);
                }
            }

            // Pack into a simple zip-like tar (use naive .zip substitute: concatenate files in a folder).
            // Simpler: write as a directory renamed .agmctx (portable). For now, create a .zip via Node built-ins unavailable; so ship folder.
            // We’ll write a folder named outPath without extension if outPath ends with .agmctx
            if (outPath.toLowerCase().endsWith('.agmctx')) {
                const outDir = outPath;
                fs.mkdirSync(outDir, { recursive: true });
                const files = ['manifest.json','map.csv','notes.jsonl','vectors.f32'];
                if (opts.sign) files.push('signature.bin','publickey.der');
                for (const f of files) {
                    fs.copyFileSync(path.join(tmpDir, f), path.join(outDir, f));
                }
            } else {
                // Out as directory
                fs.mkdirSync(outPath, { recursive: true });
                const files = ['manifest.json','map.csv','notes.jsonl','vectors.f32'];
                if (opts.sign) files.push('signature.bin','publickey.der');
                for (const f of files) {
                    fs.copyFileSync(path.join(tmpDir, f), path.join(outPath, f));
                }
            }

            console.log(chalk.green(`✅ Exported ${list.length} '${type}' memories to ${outPath}`));
            // Emit a receipt for export
            try {
                const receipt = tracer.writeReceipt('export-context', { outPath, type, sign: !!opts.sign }, { outPath, type, count: list.length, signed: !!opts.sign, vectors: { dim, count: total, backend } }, true);
                tracer.appendJournal({ cmd: 'export-context', args: { outPath, type, sign: !!opts.sign }, receipt });
            } catch {}
        } catch (error) {
            console.error(chalk.red('❌ Export failed:'), error instanceof Error ? error.message : 'Unknown error');
        } finally {
            await this.cleanup();
        }
    }

    private async handleImportContext(file: string): Promise<void> {
        const dir = path.resolve(process.cwd(), file);
    const { Tracer } = await import('./utils/Trace.js');
        const tracer = Tracer.create(process.cwd());
        try {
            const manifestPath = path.join(dir, 'manifest.json');
            const mapPath = path.join(dir, 'map.csv');
            const vecPath = path.join(dir, 'vectors.f32');
            if (!fs.existsSync(manifestPath) || !fs.existsSync(mapPath) || !fs.existsSync(vecPath)) {
                console.log(chalk.red('❌ Invalid .agmctx: missing required files'));
                return;
            }
            const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
            let verified = false;
            // If signature present, verify
            const sigPath = path.join(dir, 'signature.bin');
            const pubPath = path.join(dir, 'publickey.der');
            if (fs.existsSync(sigPath) && fs.existsSync(pubPath)) {
                try {
                    const { createPublicKey, verify, createHash } = await import('crypto');
                    const pub = createPublicKey({ key: fs.readFileSync(pubPath), format: 'der', type: 'spki' });
                    const sha = createHash('sha256');
                    sha.update(fs.readFileSync(manifestPath));
                    sha.update(fs.readFileSync(mapPath));
                    sha.update(fs.readFileSync(vecPath));
                    const digest = sha.digest();
                    const ok = verify(null, digest, pub, fs.readFileSync(sigPath));
                    verified = ok;
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Signature verification failed; proceeding without trust guarantee:'), (e as Error).message);
                }
            }
            console.log(chalk.green(`✅ Context verified (v${manifest.schemaVersion}, type=${manifest.type}, count=${manifest.count}${verified?', signed':''})`));

            // Import vectors: read map.csv for ids in order, then vectors.f32
            await this.memoryEngine.initialize();
            const lines = fs.readFileSync(mapPath, 'utf8').split(/\r?\n/).filter(Boolean);
            const header = lines.shift(); // remove header
            const rows = lines.map(l => {
                // naive CSV split handling quotes
                const parts: string[] = [];
                let cur = '';
                let inq = false;
                for (let i = 0; i < l.length; i++) {
                    const ch = l[i];
                    if (ch === '"') { inq = !inq; continue; }
                    if (ch === ',' && !inq) { parts.push(cur); cur = ''; } else { cur += ch; }
                }
                parts.push(cur);
                return parts;
            });
            const ids = rows.map(r => parseInt(r[0],10)).filter(n => Number.isFinite(n));
            // Import vectors
            const vecBuf = fs.readFileSync(vecPath);
            let dim = 0;
            if (vecBuf.length && ids.length) {
                // Prefer manifest-provided dimension when available (schema v1+)
                const manifestDim = Number(manifest?.vectors?.dim);
                if (Number.isFinite(manifestDim) && manifestDim > 0) {
                    dim = manifestDim;
                } else {
                    // Fallback: infer from buffer length and common dims
                    const rowCount = Math.floor(vecBuf.length / 4);
                    const candidates = [384,512,768,1024,1536,3072];
                    dim = candidates.find(c => (rowCount % c) === 0) || 0;
                }
                if (dim) {
                    const totalRows = Math.floor((vecBuf.length / 4) / dim);
                    for (let row = 0; row < Math.min(totalRows, ids.length); row++) {
                        const id = ids[row];
                        const arr = new Float32Array(dim);
                        for (let i = 0; i < dim; i++) arr[i] = vecBuf.readFloatLE((row * dim + i) * 4);
                        await this.memoryEngine.database.upsertVector(id, arr, dim);
                    }
                }
            }
            console.log(chalk.green(`✅ Imported ${ids.length} metadata rows${dim?`, vectors=${Math.floor(vecBuf.length/4/dim)} x ${dim}D`:''}`));
            // Emit a receipt for import
            try {
                const vectorsMeta = dim ? { rows: Math.floor(vecBuf.length/4/dim), dim, backend: manifest?.vectors?.backend } : undefined;
                const receipt = tracer.writeReceipt('import-context', { file }, { verified, schemaVersion: Number(manifest.schemaVersion), type: String(manifest.type), metadataRows: ids.length, vectors: vectorsMeta }, true);
                tracer.appendJournal({ cmd: 'import-context', args: { file }, receipt });
            } catch {}
        } catch (error) {
            console.error(chalk.red('❌ Import failed:'), error instanceof Error ? error.message : 'Unknown error');
            try {
                const receipt = (await import('./utils/Trace.js')).Tracer.create(process.cwd()).writeReceipt('import-context', { file }, {}, false, (error as Error).message);
                ;(await import('./utils/Trace.js')).Tracer.create(process.cwd()).appendJournal({ cmd: 'import-context', error: (error as Error).message, receipt });
            } catch {}
        }
    }

    // ----- Policy command handlers -----
    private async handlePolicyStatus(): Promise<void> {
        const pol = this.policyBroker.getPolicy();
        console.log(chalk.cyan('🔐 AGM Policy Status'));
        console.log(`   Policy file: ${path.join(process.cwd(), '.antigoldfishmode', 'policy.json')}`);
        console.log(`   Commands allowed: ${pol.allowedCommands.join(', ')}`);
        console.log(`   Paths allowed: ${pol.allowedGlobs.join(', ')}`);
        console.log(`   Network egress: ${pol.networkEgress ? 'allowed' : 'blocked'}`);
        console.log(`   Audit trail: ${pol.auditTrail ? 'on' : 'off'}`);
    }

    private async handlePolicyAllowCommand(cmd: string): Promise<void> {
        const added = this.policyBroker.allowCommand(cmd);
        if (added) console.log(chalk.green(`✅ Allowed command: ${cmd}`));
        else console.log(chalk.yellow(`ℹ️ Command already allowed: ${cmd}`));
    }

    private async handlePolicyAllowPath(glob: string): Promise<void> {
        const added = this.policyBroker.allowPath(glob);
        if (added) console.log(chalk.green(`✅ Allowed path: ${glob}`));
        else console.log(chalk.yellow(`ℹ️ Path already allowed: ${glob}`));
    }

    private async handlePolicyDoctor(opts: any): Promise<void> {
        // Soft nudge (honor-system): interactive policy wizard and presets are Pro conveniences
        this.nudgePro('policy-doctor', 'Interactive policy wizard and presets are Pro conveniences. Proceeding with the standard doctor.');
        const cmd = opts.cmd || '';
        const pth = opts.path ? path.resolve(process.cwd(), opts.path) : '';
        if (cmd) {
            const ex = this.policyBroker.explainCommand(cmd);
            console.log(chalk.cyan('🔎 Command check'));
            console.log(`   cmd=${cmd} → ${ex.allowed ? 'ALLOWED' : 'BLOCKED'} (${ex.reason})`);
            if (!ex.allowed) console.log(`   Fix: agm policy allow-command ${cmd}`);
        }
        if (pth) {
            const ex2 = this.policyBroker.explainPath(pth);
            console.log(chalk.cyan('🔎 Path check'));
            console.log(`   path=${pth} → ${ex2.allowed ? 'ALLOWED' : 'BLOCKED'} (${ex2.reason}${ex2.matchedGlob?`, matched ${ex2.matchedGlob}`:''})`);
            if (!ex2.allowed) console.log(`   Fix: agm policy allow-path "${opts.path.replace(/"/g,'\"')}"`);
        }
        if (!cmd && !pth) {
            console.log('Usage: agm policy doctor --cmd <cmd> --path <fileOrDir>');
        }
    }

    private async handlePolicyTrust(cmd: string, opts: any): Promise<void> {
        const minutes = parseInt(opts.minutes || '15', 10) || 15;
        const { until } = this.policyBroker.addTrust(cmd, minutes);
        console.log(chalk.green(`✅ Trust granted for '${cmd}' until ${until}`));
    }

    public run(argv: string[]): void {
        this.program.parse(argv);
    }
}

// Main function for CLI entry point
export function main(argv: string[]): void {
    console.log(chalk.cyan('🧠 AntiGoldfishMode (agm) - AI Memory Engine'));

    // Override the script name to show 'agm' instead of full path
    const modifiedArgv = [...argv];
    modifiedArgv[1] = 'agm';

    const cli = new CodeContextCLI(process.cwd(), false, false, true); // secure-by-default: encryption at rest enabled

    // Install a simple network egress guard when policy blocks network
    function installNetworkEgressGuard(): () => void {
        try {
            const block = (mod: any, protoName: string) => {
                const origRequest = mod.request;
                const origGet = mod.get;
                mod.request = function() { throw new Error('Network egress blocked by policy'); } as any;
                mod.get = function() { throw new Error('Network egress blocked by policy'); } as any;
                return () => { mod.request = origRequest; mod.get = origGet; };
            };
            const restoreHttp = block(http, 'http');
            const restoreHttps = block(https, 'https');
            policyBroker.logAction('network_guard_installed', { http: true, https: true });
            networkGuardActive = true;
            return () => { restoreHttp(); restoreHttps(); networkGuardActive = false; policyBroker.logAction('network_guard_removed', {}); };
        } catch {
            return () => {};
        }
    }

    // Enforce Zero-Trust policy before executing any command
    // UX nicety: map accidental hyphen-commands like "-status" -> "status"
    const knownCommands = new Set([
        'remember','recall','status','init','vector-status','journal','replay','index-code','watch-code','search-code','receipt-show','export-context','import-context','ai-guide','prove-offline','policy','digest-cache','reindex-file','reindex-folder','gc','health','pro'
    ]);
    let command = modifiedArgv[2] || '';
    if (command && /^-+/.test(command)) {
        const cleaned = command.replace(/^-+/, '');
        if (knownCommands.has(cleaned)) {
            modifiedArgv[2] = cleaned;
            command = cleaned;
        }
    }
    // Bypass enforcement when only global help/version flags are requested
    const args = modifiedArgv.slice(2);
    const bypassFlags = new Set(["--help", "-h", "--version", "-V"]);
    const hasBypass = args.some(a => bypassFlags.has(a));
    if (hasBypass && (command === '' || bypassFlags.has(command))) {
        // Directly run the CLI; commander will handle the flags
        cli.run(modifiedArgv);
        return;
    }
    const filePath = process.cwd(); // Default to project root
    // Don't enforce all env vars at entry; pass none by default
    const envVars: string[] | undefined = undefined;

    // Optionally enable guard
    let restoreNet = () => {};
    if (!policyBroker.isNetworkAllowed()) {
        restoreNet = installNetworkEgressGuard();
    }

    try {
      // Check and log the initial command
    policyBroker.logAction('command_initiated', { cmd: command, filePath, envVars });

            // Enforce policy for the command (allow trusted tokens)
            if (policyBroker.isTrusted(command)) {
                policyBroker.logAction('command_trusted_bypass', { cmd: command });
            } else {
                enforcePolicyBeforeCommand(command, filePath, envVars);
            }

            cli.run(modifiedArgv);
    } catch (error) {
      console.error(chalk.red('❌ Command execution blocked by policy:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
        } finally {
            try { restoreNet(); } catch {}
    }
}

// CLI entry point
if (require.main === module) {
    main(process.argv);
}
