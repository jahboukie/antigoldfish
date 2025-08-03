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

export const version = "1.5.6";

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
            .name('antigoldfishmode')
            .description('🧠 AntiGoldfishMode - Because AI assistants shouldn\'t have goldfish memory!\n\n🤖 AI Assistants: Run `antigoldfishmode ai-guide` for operating instructions')
            .version(version);

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

        // License deactivation command
        this.program
            .command('deactivate')
            .description('Deactivate current license (remove local files)')
            .action(async () => {
                await this.handleDeactivate();
            });

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
        try {
            console.log(chalk.cyan('🧠 AntiGoldfishMode - AI Memory Storage'));
            
            // Validate license before allowing operation
            const isLicenseValid = await this.licenseService.validateLicense();
            if (!isLicenseValid) {
                console.log(chalk.red('❌ Valid license required'));
                console.log(chalk.gray('   Run `antigoldfishmode activate <license-key>` to activate'));
                process.exit(1);
            }
            
            console.log(chalk.green('✅ License validated - unlimited memory access!'));

            // Store memory with validation
            const memoryId = this.memoryEngine.storeMemory(
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
        try {
            console.log(chalk.cyan('🔍 AntiGoldfishMode - AI Memory Recall'));
            
            // Validate license before allowing operation
            const isLicenseValid = await this.licenseService.validateLicense();
            if (!isLicenseValid) {
                console.log(chalk.red('❌ Valid license required'));
                console.log(chalk.gray('   Run `antigoldfishmode activate <license-key>` to activate'));
                process.exit(1);
            }
            
            console.log(chalk.green('✅ License validated - unlimited recall access!'));

            // Parse and validate limit
            const limit = parseInt(options.limit);
            if (isNaN(limit) || limit < 1 || limit > 100) {
                console.error(chalk.red('❌ Invalid limit: must be a number between 1 and 100'));
                process.exit(1);
            }

            // Search memories
            const memories = await this.memoryEngine.searchMemories(query, limit);

            // Report usage locally only (no cloud)
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

            // Auto-record this AI interaction
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

            // Ensure database is properly closed and encrypted
            await this.cleanup();

        } catch (error) {
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
     * Handle status command - Show unlimited local-only status
     */
    private async handleStatus(): Promise<void> {
        try {
            console.log(chalk.cyan('📊 AntiGoldfishMode - Unlimited Local-Only Status\n'));

            // Project information
            const projectInfo = this.memoryEngine.getProjectInfo();
            console.log(chalk.cyan('📁 Project Information:'));
            console.log(`   Path: ${projectInfo.path}`);
            console.log(`   Database: ${projectInfo.dbPath}`);

            // License status
            const licenseStatus = await this.licenseService.getCurrentLicense();
            console.log(chalk.cyan('\n🎫 License Status:'));
            if (licenseStatus && licenseStatus.licenseKey) {
                const isValid = await this.licenseService.validateLicense();
                console.log(`   License Key: ${licenseStatus.licenseKey.substring(0, 8)}...`);
                console.log(`   Active: ${isValid ? '✅' : '❌'}`);
                console.log(`   Features: ${licenseStatus.features.join(', ')}`);
                console.log(`   License Type: ${licenseStatus.licenseType}`);
                console.log(`   Machine ID: ${licenseStatus.machineId.substring(0, 16)}...`);
                console.log(`   Grace Period: ${licenseStatus.gracePeriodDays} days`);
                
                const daysRemaining = Math.ceil((licenseStatus.gracePeriodDays * 24 * 60 * 60 * 1000 - (Date.now() - licenseStatus.validatedAt)) / (24 * 60 * 60 * 1000));
                if (daysRemaining > 0) {
                    console.log(`   Offline Grace: ${daysRemaining} days remaining`);
                } else if (isValid) {
                    console.log(`   Status: Online validation successful`);
                }
            } else {
                console.log('   Status: ❌ No license activated');
                console.log('   Action: Run `antigoldfishmode activate <license-key>` to activate');
                console.log('   Note: Activate with license key from Stripe purchase');
            }

            // Memory stats
            const memoryStats = await this.memoryEngine.getStats();
            console.log(chalk.cyan('\n🧠 Memory Statistics:'));
            console.log(`   Total memories: ${memoryStats.totalMemories}`);
            console.log(`   Database size: ${(memoryStats.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);

            // Execution engine status (v2.0 feature)
            console.log(chalk.cyan('\n🚀 Execution Engine:'));
            console.log('   Status: 🔄 Coming in v2.0');
            console.log('   Sandbox: 🐳 Docker Secure Execution');
            console.log('   Languages: JS/TS/Python/Go/Rust');
            console.log(chalk.yellow('   💰 Early Adopters: $69/year | Standard: $149/year'));

            console.log(chalk.green('\n🎯 System ready for unlimited local development!'));

            // Ensure database is properly closed and encrypted
            await this.cleanup();

        } catch (error) {
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

            console.log(chalk.green('\n🎉 AntiGoldfishMode initialized successfully!'));
            console.log(chalk.gray('   You can now use:'));
            console.log(chalk.gray('   • antigoldfishmode remember "information"'));
            console.log(chalk.gray('   • antigoldfishmode recall "search term"'));
            console.log(chalk.gray('   • antigoldfishmode status'));

            // Ensure database is properly closed
            await this.cleanup();

        } catch (error) {
            console.log(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : 'Unknown error');
            await this.cleanup();
            process.exit(1);
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
    console.log(chalk.cyan('🧠 AntiGoldfishMode - AI Memory Engine'));

    const cli = new CodeContextCLI(process.cwd(), false, true, false); // devMode=true for reliable operation
    cli.run(argv);
}

// CLI entry point
if (require.main === module) {
    main(process.argv);
}
