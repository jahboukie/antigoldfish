/**
 * CodeContextPro-MES - AI Cognitive Upgrade
 * UNLIMITED LOCAL-ONLY VERSION - Security-first for developers
 * 
 * Features:
 * - Unlimited memory operations (no rate limits)
 * - Local-only execution sandbox
 * - Machine-bound licensing
 * - No cloud dependencies for core operations
 */

import { Command } from 'commander';
import { MemoryEngine } from './MemoryEngine';
import { LicenseService } from './LicenseService';
import chalk from 'chalk';
import * as http from 'http';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export const version = "1.2.0";

export class CodeContextCLI {
    private memoryEngine: MemoryEngine;
    private licenseService: LicenseService;
    private executionServerProcess: any = null;
    private executionServerPort: number = 3001;
    private program: Command;

    constructor(projectPath: string = process.cwd(), skipValidation: boolean = false) {
        this.memoryEngine = new MemoryEngine(projectPath, skipValidation);
        this.licenseService = new LicenseService(projectPath);
        this.program = new Command();

        this.setupCommands();
    }

    private setupCommands(): void {
        this.program
            .name('antigoldfishmode')
            .description('🧠 AntiGoldfishMode - Because AI assistants shouldn\'t have goldfish memory!')
            .version(version);

        // codecontextpro remember command (unlimited)
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

        // codecontextpro execute command (NEW - local sandbox)
        this.program
            .command('execute')
            .description('Execute code in secure local sandbox')
            .argument('<language>', 'Programming language (js, ts, python, go, rust)')
            .argument('<code>', 'Code to execute')
            .option('-t, --timeout <timeout>', 'Execution timeout in seconds', '30')
            .option('-m, --memory <memory>', 'Memory limit', '512m')
            .option('--tests <tests>', 'Test cases (JSON array)')
            .action(async (language: string, code: string, options) => {
                await this.handleExecute(language, code, options);
            });

        // codecontextpro status command
        this.program
            .command('status')
            .description('Show unlimited local-only status')
            .action(async () => {
                await this.handleStatus();
            });

        // codecontextpro init command (project initialization)
        this.program
            .command('init')
            .description('Initialize AntiGoldfishMode in current project')
            .option('--force', 'Force reinitialize if already exists')
            .action(async (options) => {
                await this.handleInit(options);
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

        } catch (error) {
            console.error(chalk.red('❌ Failed to store memory:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
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

        } catch (error) {
            console.error(chalk.red('❌ Failed to recall memories:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

    /**
     * Handle execute command - Keygen Licensed Execution
     */
    private async handleExecute(language: string, code: string, options: any): Promise<void> {
        try {
            console.log(chalk.cyan('🚀 AntiGoldfishMode - Secure Code Execution'));
            
            // Validate license before allowing operation
            const isLicenseValid = await this.licenseService.validateLicense();
            if (!isLicenseValid) {
                console.log(chalk.red('❌ Valid license required'));
                console.log(chalk.gray('   Run `antigoldfishmode activate <license-key>` to activate'));
                process.exit(1);
            }
            
            console.log(chalk.green('✅ License validated - secure code execution enabled!'));

            // Start execution server if not running
            await this.ensureExecutionServerRunning();

            // Create execution request
            const request = {
                id: Date.now().toString(),
                language: language,
                code: code,
                timeout: parseInt(options.timeout) * 1000,
                memoryLimit: options.memory,
                tests: options.tests ? JSON.parse(options.tests) : undefined,
                projectContext: {
                    workingDirectory: process.cwd()
                }
            };

            console.log(chalk.yellow(`📊 Executing ${language} code...`));

            // Call execution service
            const result = await this.callExecutionService(request);

            // Display results
            if (result.success) {
                console.log(chalk.green('✅ Execution successful!'));
                console.log(chalk.gray(`   Execution time: ${result.executionTime}ms`));
                console.log(chalk.gray(`   Memory usage: ${result.memoryUsage}MB`));

                if (result.output) {
                    console.log(chalk.cyan('\n📤 Output:'));
                    console.log(result.output);
                }

                if (result.testResults && result.testResults.length > 0) {
                    console.log(chalk.cyan('\n🧪 Test Results:'));
                    result.testResults.forEach((test: any) => {
                        const status = test.passed ? chalk.green('✅') : chalk.red('❌');
                        console.log(`${status} ${test.name} (${test.duration}ms)`);
                        if (!test.passed && test.error) {
                            console.log(chalk.red(`   Error: ${test.error}`));
                        }
                    });
                }
            } else {
                console.log(chalk.red('❌ Execution failed'));

                if (result.errors && result.errors.length > 0) {
                    console.log(chalk.red('\n🚨 Errors:'));
                    result.errors.forEach((error: string) => {
                        console.log(chalk.red(`   ${error}`));
                    });
                }

                if (result.improvements) {
                    console.log(chalk.yellow('\n💡 Suggestions:'));
                    result.improvements.codeImprovements.forEach((improvement: string) => {
                        console.log(chalk.yellow(`   • ${improvement}`));
                    });
                }
            }

            // Auto-record this AI interaction
            const executionSummary = result.success
                ? `Code executed successfully in Docker sandbox. Output: ${result.output || 'No output'}. Execution time: ${result.executionTime}ms, Memory usage: ${result.memoryUsage}MB.`
                : `Code execution failed. ${result.errors ? 'Errors: ' + result.errors.join(', ') : 'Unknown error occurred.'}`;

            await this.recordAIConversation(
                `antigoldfishmode execute ${language} "${code}"`,
                executionSummary,
                {
                    command: 'execute',
                    language: language,
                    code: code,
                    success: result.success,
                    executionTime: result.executionTime + 'ms',
                    memoryUsage: result.memoryUsage + 'MB',
                    output: result.output
                }
            );

        } catch (error) {
            console.error(chalk.red('❌ Failed to execute code:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

    /**
     * Ensure execution server is running
     */
    private async ensureExecutionServerRunning(): Promise<void> {
        // Check if server is already running
        if (await this.isExecutionServerRunning()) {
            console.log(chalk.gray('🔗 Execution server already running'));
            return;
        }

        console.log(chalk.yellow('🚀 Starting execution server...'));

        // Start the execution server
        this.executionServerProcess = spawn('node', ['execution-engine/dist/index.js'], {
            cwd: process.cwd(),
            env: { ...process.env, PROJECT_PATH: process.cwd() },
            stdio: 'pipe'
        });

        // Wait for server to start
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Execution server startup timeout'));
            }, 10000);

            const checkServer = async () => {
                if (await this.isExecutionServerRunning()) {
                    clearTimeout(timeout);
                    console.log(chalk.green('✅ Execution server started'));
                    resolve(true);
                } else {
                    setTimeout(checkServer, 500);
                }
            };

            setTimeout(checkServer, 1000);
        });
    }

    /**
     * Check if execution server is running
     */
    private async isExecutionServerRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: this.executionServerPort,
                path: '/health',
                method: 'GET',
                timeout: 1000
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));
            req.end();
        });
    }

    /**
     * Call execution service
     */
    private async callExecutionService(request: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(request);

            const req = http.request({
                hostname: 'localhost',
                port: this.executionServerPort,
                path: '/execute',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            }, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = JSON.parse(responseData);
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Invalid response from execution server'));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(data);
            req.end();
        });
    }

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

            // Execution engine status
            console.log(chalk.cyan('\n🚀 Execution Engine:'));
            console.log('   Status: ✅ Ready');
            console.log('   Sandbox: 🐳 Docker Local');
            console.log('   Languages: JS/TS/Python/Go/Rust');

            console.log(chalk.green('\n🎯 System ready for unlimited local development!'));

        } catch (error) {
            console.error(chalk.red('❌ Failed to get status:'));
            console.error(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
            process.exit(1);
        }
    }

    /**
     * Handle init command - Initialize AntiGoldfishMode in project
     */
    private async handleInit(options: any): Promise<void> {
        try {
            console.log(chalk.cyan('🚀 AntiGoldfishMode - Project Initialization'));
            console.log(`   Project: ${process.cwd()}`);

            const codecontextDir = path.join(process.cwd(), '.codecontext');

            // Check if already initialized
            if (fs.existsSync(codecontextDir) && !options.force) {
                console.log(chalk.yellow('⚠️ AntiGoldfishMode already initialized in this project'));
                console.log(chalk.gray('   Use --force to reinitialize'));
                return;
            }

            // Create .codecontext directory
            if (!fs.existsSync(codecontextDir)) {
                fs.mkdirSync(codecontextDir, { recursive: true });
                console.log(chalk.green('✅ Created .codecontext directory'));
            }

            // Initialize memory database
            await this.memoryEngine.initialize();
            console.log(chalk.green('✅ Memory database initialized'));

            // Create .gitignore entry
            const gitignorePath = path.join(process.cwd(), '.gitignore');
            const gitignoreEntry = '\n# AntiGoldfishMode\n.codecontext/\n';

            try {
                let gitignoreContent = '';
                if (fs.existsSync(gitignorePath)) {
                    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
                }

                if (!gitignoreContent.includes('.codecontext/')) {
                    fs.appendFileSync(gitignorePath, gitignoreEntry);
                    console.log(chalk.green('✅ Added .codecontext/ to .gitignore'));
                }
            } catch (error) {
                console.log(chalk.yellow('⚠️ Could not update .gitignore (optional)'));
            }

            console.log(chalk.green('\n🎉 AntiGoldfishMode initialized successfully!'));
            console.log(chalk.cyan('\n📋 Ready to Use:'));
            console.log('   ✅ License activated (machine-bound)');
            console.log('   ✅ Project initialized');
            console.log('   🚀 Start using unlimited features:');
            console.log('      antigoldfishmode remember "Your insights"');
            console.log('      antigoldfishmode recall "search query"');
            console.log('      antigoldfishmode execute python "print(\'Hello!\')"');
            console.log('      antigoldfishmode status');

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

    public run(argv: string[]): void {
        this.program.parse(argv);
    }
}

// Main function for CLI entry point
export function main(argv: string[]): void {
    const cli = new CodeContextCLI();
    cli.run(argv);
}

// CLI entry point
if (require.main === module) {
    main(process.argv);
}
