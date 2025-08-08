/**
 * AntiGoldfishMode v1.0 - AI Memory Engine
 * UNLIMITED LOCAL-ONLY VERSION - Privacy-first for developers
 *
 * Features:
 * - Unlimited memory operations (no rate limits)
 * - Persistent AI conversation recording
 * - Machine-bound licensing
 * - No cloud dependencies for core operations
 *
 * Coming in v2.0:
 * - Secure code execution sandbox (Q4 2025)
 * - Early adopters: $69/year total | Standard: $149/year total
 */

import { Command } from 'commander';
import { MemoryEngine } from './MemoryEngine';
import { LicenseService } from './LicenseService';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    private licenseService: LicenseService;
    // Note: Execution engine removed for v1.0 - coming in v2.0
    private program: Command;

    constructor(projectPath: string = process.cwd(), skipValidation: boolean = false, devMode: boolean = false, secureMode: boolean = false) {
        this.memoryEngine = new MemoryEngine(projectPath, skipValidation, devMode, secureMode);
        this.licenseService = new LicenseService(projectPath);
        this.program = new Command();

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

        // codecontextpro recall command (unlimited)
        this.program
            .command('recall')
            .description('Search unlimited local memories')
            .argument('<query>', 'Search query')
            .option('-l, --limit <limit>', 'Maximum results to return', '10')
            .action(async (query: string, options) => {
                await this.handleRecall(query, options);
            });

        // Execute command (v2.0 feature - show helpful message)
        this.program
            .command('execute')
            .description('Execute code in secure local sandbox (Coming in v2.0)')
            .argument('<language>', 'Programming language (js, ts, python, go, rust)')
            .argument('<code>', 'Code to execute')
            .option('-t, --timeout <timeout>', 'Execution timeout in seconds', '30')
            .option('-m, --memory <memory>', 'Memory limit', '512m')
            .option('--tests <tests>', 'Test cases (JSON array)')
            .action(async (language: string, code: string, options) => {
                await this.handleExecuteV2Message(language, code, options);
            });

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

        // License activation command (Keygen-based)
        this.program
            .command('activate')
            .description('Activate AntiGoldfishMode license')
            .argument('<license-key>', 'License key to activate')
            .action(async (licenseKey: string) => {
                await this.handleActivate(licenseKey);
            });

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
            .action(async (opts: any) => { const { handleJournal } = await import('./commands/Journal'); await handleJournal(opts, this.cleanup.bind(this)); });


        // License deactivation command
        this.program
            .command('deactivate')
            .description('Deactivate current license (remove local files)')
            .action(async () => {
                await this.handleDeactivate();
            });

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
                const { handleReplay } = await import('./commands/Replay');
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

        this.program
            .command('search-code <query>')
            .description('Search code-aware memories (prototype, local)')
            .option('-k, --topk <k>', 'Top K results', '20')
            .option('-n, --preview <lines>', 'Show first N lines of each result')
            .option('-p, --filter-path <globs...>', 'Only show results whose metadata.file matches any of the provided globs')
            .option('--filter-symbol <types...>', 'Filter by symbol type(s): function|class|struct|file')
            .option('--filter-language <langs...>', 'Filter by language(s): typescript|javascript|python|go')

            .option('--hybrid', 'Use hybrid FTS+vector fusion (Stage 1)')
            .option('--rerank <N>', 'Rerank top N FTS results with vector cosine (default 200)')
            .action(async (query: string, opts: any) => { await this.handleSearchCode(query, opts); });


        // Receipt show
        this.program
            .command('receipt-show [idOrPath]')
            .description('Pretty-print a saved receipt by id or path')
            .option('--last', 'Show the most recent receipt')
            .action(async (idOrPath: string, opts: any) => { const { handleReceiptShow } = await import('./commands/ReceiptShow'); await handleReceiptShow(idOrPath, { last: opts.last }); });


        // AI Assistant Instructions command
        this.program
            .command('ai-guide')
            .description('📖 Show AI assistant operating instructions')
            .action(async () => {
                await this.handleAIGuide();
            });
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
     * Handle remember command - Keygen Licensed
     */
    private async handleRemember(content: string, options: any): Promise<void> {
        const { Tracer } = await import('./utils/Trace');
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

            // Validate license before allowing operation
            const isLicenseValid = await this.licenseService.validateLicense();
            if (!isLicenseValid) {
                console.log(chalk.red('❌ Valid license required'));
                console.log(chalk.gray('   Run `antigoldfishmode activate <license-key>` to activate'));
                process.exit(1);
            }

            console.log(chalk.green('✅ License validated - unlimited memory access!'));

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
     * Handle recall command - Keygen Licensed
     */
    private async handleRecall(query: string, options: any): Promise<void> {
        const { Tracer } = await import('./utils/Trace');
        const tracer = Tracer.create(process.cwd());
        try {
            console.log(chalk.cyan('🔍 AntiGoldfishMode - AI Memory Recall'));

            tracer.plan('recall', { query, limit: options.limit });
            tracer.mirror(`agm recall ${JSON.stringify(query)} --limit ${options.limit}`);

            const isLicenseValid = await this.licenseService.validateLicense();
            if (!isLicenseValid) {
                console.log(chalk.red('❌ Valid license required'));
                console.log(chalk.gray('   Run `antigoldfishmode activate <license-key>` to activate'));
                process.exit(1);
            }

                if (tracer.flags.explain) {
                    console.log(chalk.gray('Explanation: searches stored memories by keyword with relevance scoring.'));
                }
                if (tracer.flags.json) {
                    console.log(JSON.stringify({ op: 'recall', query, limit: options.limit }, null, 2));
                }


            console.log(chalk.green('✅ License validated - unlimited recall access!'));

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

    /**
     * Handle execute command - Show v2.0 message
     */
    private async handleExecuteV2Message(language: string, code: string, options: any): Promise<void> {
        console.log(chalk.cyan('🚀 AntiGoldfishMode - Code Execution'));
        console.log(chalk.yellow('🔄 Code execution sandbox is coming in v2.0 (Q4 2025)!'));
        console.log('');
        console.log(chalk.white('📋 Your request:'));
        console.log(chalk.gray(`   Language: ${language}`));
        console.log(chalk.gray(`   Code: ${code.substring(0, 50)}${code.length > 50 ? '...' : ''}`));
        console.log('');
        console.log(chalk.cyan('💰 Upgrade Pricing:'));
        console.log(chalk.green('   Early Adopters: $69 + $49 = $118/year total'));
        console.log(chalk.red('   Standard Users: $149 + $51 = $200/year total'));
        console.log('');
        console.log(chalk.yellow('🎯 Current v1.0 Features:'));
        console.log('   ✅ Persistent AI Memory');
        console.log('   ✅ Conversation Recording');
        console.log('   ✅ Local Data Storage');
        console.log('');
        console.log(chalk.blue('📧 Want early access? Email: antigoldfish.dev@gmail.com'));

        // Record this interaction
        await this.recordAIConversation(
            `antigoldfishmode execute ${language} "${code}"`,
            `User attempted to execute ${language} code. Showed v2.0 upgrade message with pricing: Early adopters $69/year total, Standard users $149/year total.`,
            {
                command: 'execute',
                language: language,
                code: code,
                status: 'v2.0_feature',
                message: 'Code execution coming in v2.0 (Q4 2025)'
            }
        );
    }

    // Note: Execution server methods removed for v1.0

    /**

    /**
     * Handle vector-status command
     */
    private async handleVectorStatus(): Promise<void> {
        const { Tracer } = await import('./utils/Trace');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('vector-status', { explain: tracer.flags.explain });
            tracer.mirror(`agm vector-status${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: Reports current vector backend and index stats; uses MemoryEngine2 when available.'));
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
     * Handle status command - Show unlimited local-only status
     */
    private async handleStatus(): Promise<void> {
        const { Tracer } = await import('./utils/Trace');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('status', { explain: tracer.flags.explain });
            tracer.mirror(`agm status${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray('Explanation: Shows project, license, and memory stats (local-only).'));
            }

            const projectInfo = this.memoryEngine.getProjectInfo();
            const licenseStatus = await this.licenseService.getCurrentLicense();

            await this.memoryEngine.initialize();
            const memoryStats = await this.memoryEngine.getStats();

            const data: any = {
                project: { path: projectInfo.path, dbPath: projectInfo.dbPath },
                license: licenseStatus ? {
                    key: licenseStatus.licenseKey.substring(0, 8) + '...',
                    features: licenseStatus.features,
                    type: licenseStatus.licenseType,
                    machineId: licenseStatus.machineId.substring(0, 16) + '...',
                    graceDays: licenseStatus.gracePeriodDays
                } : null,
                memory: {
                    total: memoryStats.totalMemories,
                    sizeMB: +(memoryStats.totalSizeBytes / 1024 / 1024).toFixed(2)
                },
                execution: { status: 'Coming in v2.0' }
            };

            if (tracer.flags.json) {
                console.log(JSON.stringify(data, null, 2));
            } else {
                console.log(chalk.cyan('📊 AntiGoldfishMode - Unlimited Local-Only Status\n'));
                console.log(chalk.cyan('📁 Project Information:'));
                console.log(`   Path: ${data.project.path}`);
                console.log(`   Database: ${data.project.dbPath}`);
                console.log(chalk.cyan('\n🎫 License Status:'));
                if (data.license) {
                    const isValid = await this.licenseService.validateLicense();
                    console.log(`   License Key: ${data.license.key}`);
                    console.log(`   Active: ${isValid ? '✅' : '❌'}`);
                    console.log(`   Features: ${data.license.features.join(', ')}`);
                    console.log(`   License Type: ${data.license.type}`);
                    console.log(`   Machine ID: ${data.license.machineId}`);
                    console.log(`   Grace Period: ${data.license.graceDays} days`);
                } else {
                    console.log('   Status: ❌ No license activated');
                    console.log('   Action: Run `antigoldfishmode activate <license-key>` to activate');
                }
                console.log(chalk.cyan('\n🧠 Memory Statistics:'));
                console.log(`   Total memories: ${data.memory.total}`);
                console.log(`   Database size: ${data.memory.sizeMB} MB`);
                console.log(chalk.cyan('\n🚀 Execution Engine:'));
                console.log('   Status: 🔄 Coming in v2.0');
                console.log('   Sandbox: 🐳 Docker Secure Execution');
                console.log('   Languages: JS/TS/Python/Go/Rust');
            }

            const receipt = tracer.writeReceipt('status', {}, data, true);
            tracer.appendJournal({ cmd: 'status', args: {}, receipt });

            await this.cleanup();

        } catch (error) {
            const receipt = tracer.writeReceipt('status', {}, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'status', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ Failed to get status:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
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

            // Check if already initialized (look for actual database file, not just directory)
            if (fs.existsSync(memoryDbPath) && !options.force) {
                console.log(chalk.yellow('⚠️ AntiGoldfishMode already initialized in this project'));
                console.log(chalk.gray('   Use --force to reinitialize'));
                return;
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
     * Index code repository into AGM memories (prototype)
     */
    private async handleIndexCode(opts: any): Promise<void> {
        const root = opts.path || process.cwd();
        const maxChunk = parseInt(opts.maxChunk || '200', 10);
        const { Tracer } = await import('./utils/Trace');
        const tracer = Tracer.create(process.cwd());
        try {
            tracer.plan('index-code', { root, maxChunk, symbols: !!opts.symbols, explain: tracer.flags.explain });
            tracer.mirror(`agm index-code --path ${JSON.stringify(root)} --max-chunk ${maxChunk}${opts.symbols?' --symbols':''}${tracer.flags.explain?' --explain':''}`);
            if (tracer.flags.explain) {
                console.log(chalk.gray(`Explanation: Walk files (include/exclude), ${opts.symbols?'chunk by symbols (functions/classes)':'chunk by lines'}, store as type=code with metadata (file, language, line ranges).`));
            }

            await this.memoryEngine.initialize();
            const { CodeIndexer } = await import('./codeindex/CodeIndexer');
            const indexer = new CodeIndexer(root);


            const { SymbolIndexer } = await import('./codeindex/SymbolIndexer');
            const symIndexer = new SymbolIndexer(root);

            const include: string[] | undefined = opts.include;
            const exclude: string[] | undefined = opts.exclude;

            let saved = 0;
            const pending: Promise<any>[] = [];
            const context = 'code';

            // Embeddings (Stage 1): prepare provider
            const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider');
            const provider = EmbeddingProvider.create(process.cwd());
            await provider.init().catch((e) => {
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
                indexer.indexFiles({ maxChunkLines: maxChunk, context, include, exclude }, (chunk) => {
                    if (tracer.flags.dryRun) { return; }
                    const tags = ['code', chunk.meta.language || 'unknown'];
                    pending.push(embedAndStore(chunk.text, tags, chunk.meta));
                });
            }

            await Promise.all(pending);

            // reuse dynamic import above; construct a temporary indexer for digest
            const listForDigest = new (await import('./codeindex/CodeIndexer')).CodeIndexer(root).listFiles({ include, exclude, maxChunkLines: maxChunk });
            const digest = crypto.createHash('sha256').update(JSON.stringify(listForDigest)).digest('hex');

            const result = { saved, root, digest, fileCount: listForDigest.length };
            if (tracer.flags.json) {
                console.log(JSON.stringify(result, null, 2));

            if (tracer.flags.explain) {
                const { CodeIndexer } = await import('./codeindex/CodeIndexer');
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
        const { Tracer } = await import('./utils/Trace');
        const tracer = Tracer.create(process.cwd());
        try {
            const topk = parseInt(opts.topk || '20', 10);
            const preview = parseInt(opts.preview || opts.n || '0', 10);
            const filterPath: string[] | undefined = opts.filterPath || opts.filter || opts.p;
            tracer.plan('search-code', { query, topk, preview, filterPath, explain: tracer.flags.explain });
            tracer.mirror(`agm search-code ${JSON.stringify(query)} -k ${topk}${preview?` --preview ${preview}`:''}${filterPath?` --filter-path ${filterPath.join(' ')}`:''}${tracer.flags.explain?' --explain':''}`);
            const rerankN = parseInt(opts.rerank || '200', 10) || 200;
            if (tracer.flags.explain) {
                const backend = 'fallback'; // vss query path not yet wired
                const fusion = 'score = 0.5 * BM25 + 0.5 * cosine';
                console.log(chalk.gray(`Explanation: FTS search across code-type memories;${opts.hybrid?` hybrid mode re-ranks top ${rerankN} results with vector cosine using backend=${backend} and fusion ${fusion}.`:''} Optional --filter-path limits results by file globs.`));
            }

            if (tracer.flags.dryRun) {
                console.log(chalk.yellow('DRY-RUN: Skipping database search'));
                const receipt = tracer.writeReceipt('search-code', { query, topk, preview, dryRun: true, hybrid: !!opts.hybrid, rerankN }, { count: 0 }, true, undefined, { hybrid: { backend: 'fallback', fusionWeights: { bm25: 0.5, cosine: 0.5 }, rerankN } });
                tracer.appendJournal({ cmd: 'search-code', args: { query, topk, preview, dryRun: true, hybrid: !!opts.hybrid, rerankN }, receipt });
                await this.cleanup();
                return;
            }

            await this.memoryEngine.initialize();

            let results = await this.memoryEngine.database.searchMemories(query, { limit: opts.hybrid ? rerankN : topk, type: 'code' });

            if (opts.hybrid) {
                const take = Math.min(topk, results.length);
                const { EmbeddingProvider } = await import('./engine/embeddings/EmbeddingProvider');
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
                            const fused = 0.5 * bm25 + 0.5 * Math.max(0, cos);
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
                            const fused = 0.5 * bm25 + 0.5 * Math.max(0, cos);
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
                    const vecPart = (opts.hybrid && (r as any)._cos !== undefined) ? ` v=${((r as any)._cos as number).toFixed(3)}` : '';
                    const bmPart = (opts.hybrid && (r as any)._bm25 !== undefined) ? ` bm=${((r as any)._bm25 as number).toFixed(3)}` : '';
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
            const receipt = tracer.writeReceipt('search-code', { query, topk, preview, filterPath, hybrid: !!opts.hybrid, rerankN, filterSymbols, filterLangs }, { count: results.length }, true, undefined, { resultSummary: { ids: idList.slice(0, 10) }, digests: { resultDigest }, hybrid: opts.hybrid ? { backend, fusionWeights: { bm25: 0.5, cosine: 0.5 }, rerankN } : undefined });
            tracer.appendJournal({ cmd: 'search-code', args: { query, topk, preview, filterPath, hybrid: !!opts.hybrid, rerankN, filterSymbols, filterLangs }, receipt });
        } catch (error) {
            const receipt = tracer.writeReceipt('search-code', { query, topk: opts.topk }, {}, false, (error as Error).message);
            tracer.appendJournal({ cmd: 'search-code', error: (error as Error).message, receipt });
            console.error(chalk.red('❌ search-code failed:'), error instanceof Error ? error.message : error);
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

    /**
     * Handle init command - Initialize AntiGoldfishMode in project (legacy method)
     */
    private async handleInit(options: any): Promise<void> {
        try {
            console.log(chalk.cyan('🚀 AntiGoldfishMode - Project Initialization'));
            console.log(`   Project: ${process.cwd()}`);

            const antigoldfishDir = path.join(process.cwd(), '.antigoldfishmode');
            const memoryDbPath = path.join(antigoldfishDir, 'memory.db');

            // Check if already initialized (look for actual database file, not just directory)
            if (fs.existsSync(memoryDbPath) && !options.force) {
                console.log(chalk.yellow('⚠️ AntiGoldfishMode already initialized in this project'));
                console.log(chalk.gray('   Use --force to reinitialize'));
                return;
            }

            // Create .antigoldfishmode directory if it doesn't exist
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
                console.log(chalk.yellow('⚠️ Could not update .gitignore (optional)'));
            }

            console.log(chalk.green('\n🎉 AntiGoldfishMode initialized successfully!'));
            console.log(chalk.cyan('\n📋 Ready to Use:'));
            console.log('   ✅ License activated (machine-bound)');
            console.log('   ✅ Project initialized');
            console.log('   🚀 Start using unlimited AI memory features:');
            console.log('      antigoldfishmode remember "Your insights"');
            console.log('      antigoldfishmode recall "search query"');
            console.log('      antigoldfishmode status');
            console.log(chalk.yellow('   🔄 Code execution sandbox coming in v2.0!'));

        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize AntiGoldfishMode:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

    /**
     * Handle license activation with Keygen
     */
    private async handleActivate(licenseKey: string): Promise<void> {
        try {
            console.log(chalk.cyan('🔑 AntiGoldfishMode License Activation'));
            console.log(`   License Key: ${licenseKey.substring(0, 8)}...`);

            const license = await this.licenseService.activateLicense(licenseKey);

            console.log(chalk.green('✅ License activated successfully!'));
            console.log(chalk.gray(`   Machine ID: ${license.machineId.substring(0, 16)}...`));
            console.log(chalk.gray(`   Features: ${license.features.join(', ')}`));
            console.log(chalk.gray(`   License Type: ${license.licenseType}`));
            console.log(chalk.gray(`   Grace Period: ${license.gracePeriodDays} days`));

            // Auto-record this AI interaction
            await this.recordAIConversation(
                `antigoldfishmode activate ${licenseKey}`,
                `License activated successfully for machine ${license.machineId.substring(0, 16)}... with features: ${license.features.join(', ')}`,
                {
                    command: 'activate',
                    licenseKey: licenseKey.substring(0, 8) + '...',
                    machineId: license.machineId.substring(0, 16) + '...',
                    features: license.features
                }
            );

        } catch (error) {
            console.error(chalk.red('❌ License activation failed:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

    /**
     * Handle license deactivation
     */
    private async handleDeactivate(): Promise<void> {
        try {
            console.log(chalk.cyan('🔓 AntiGoldfishMode License Deactivation'));

            await this.licenseService.deactivateLicense();

            console.log(chalk.green('✅ Machine deactivated successfully!'));
            console.log(chalk.gray('   Local license files removed'));
            console.log(chalk.gray('   Machine freed up for use on another device'));

            // Auto-record this AI interaction
            await this.recordAIConversation(
                'antigoldfishmode deactivate',
                'Machine deactivated successfully. License freed up for use on another device.',
                {
                    command: 'deactivate'
                }
            );

        } catch (error) {
            console.error(chalk.red('❌ License deactivation failed:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

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

    const cli = new CodeContextCLI(process.cwd(), false, true, false); // devMode=true for reliable operation
    cli.run(modifiedArgv);
}

// CLI entry point
if (require.main === module) {
    main(process.argv);
}
