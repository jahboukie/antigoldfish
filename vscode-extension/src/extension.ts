import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Memory {
    id: string;
    content: string;
    context: string;
    type: string;
    date: string;
    relevance?: number;
}

class MemoryProvider implements vscode.TreeDataProvider<Memory> {
    private _onDidChangeTreeData: vscode.EventEmitter<Memory | undefined | null | void> = new vscode.EventEmitter<Memory | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Memory | undefined | null | void> = this._onDidChangeTreeData.event;

    private memories: Memory[] = [];

    constructor() {
        this.refresh();
    }

    refresh(): void {
        this.loadMemories();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Memory): vscode.TreeItem {
        const item = new vscode.TreeItem(element.content.substring(0, 50) + '...', vscode.TreeItemCollapsibleState.None);
        item.tooltip = `${element.content}\nContext: ${element.context}\nType: ${element.type}\nDate: ${element.date}`;
        item.description = `[${element.context}] ${element.date}`;
        item.contextValue = 'memory';
        return item;
    }

    getChildren(element?: Memory): Thenable<Memory[]> {
        if (!element) {
            return Promise.resolve(this.memories);
        }
        return Promise.resolve([]);
    }

    private async loadMemories(): Promise<void> {
        try {
            const { stdout } = await execAsync('agm recall "" --limit 50');
            // Parse the AGM output to extract memories
            // This is a simplified parser - you might need to adjust based on actual output format
            this.memories = this.parseMemoriesFromOutput(stdout);
        } catch (error) {
            console.error('Failed to load memories:', error);
            this.memories = [];
        }
    }

    private parseMemoriesFromOutput(output: string): Memory[] {
        const memories: Memory[] = [];
        const lines = output.split('\n');
        
        let currentMemory: Partial<Memory> | null = null;
        
        for (const line of lines) {
            if (line.includes('Memory ID:')) {
                if (currentMemory) {
                    memories.push(currentMemory as Memory);
                }
                currentMemory = {
                    id: line.split('Memory ID:')[1]?.trim() || '',
                    content: '',
                    context: 'general',
                    type: 'general',
                    date: new Date().toISOString().split('T')[0]
                };
            } else if (line.includes('Date:') && currentMemory) {
                currentMemory.date = line.split('Date:')[1]?.trim() || '';
            } else if (line.includes('Relevance:') && currentMemory) {
                const relevanceStr = line.split('Relevance:')[1]?.trim().replace('%', '');
                currentMemory.relevance = parseFloat(relevanceStr || '0');
            } else if (line.includes('Content:') && currentMemory) {
                currentMemory.content = line.split('Content:')[1]?.trim() || '';
            }
        }
        
        if (currentMemory) {
            memories.push(currentMemory as Memory);
        }
        
        return memories;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const memoryProvider = new MemoryProvider();
    
    // Register tree data provider
    vscode.window.registerTreeDataProvider('agm-memories', memoryProvider);

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'agm.status';
    updateStatusBar();
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('agm.remember', rememberSelection),
        vscode.commands.registerCommand('agm.rememberWithContext', rememberWithContext),
        vscode.commands.registerCommand('agm.recall', recallMemories),
        vscode.commands.registerCommand('agm.quickRecall', quickRecall),
        vscode.commands.registerCommand('agm.status', showStatus),
        vscode.commands.registerCommand('agm.init', initProject),
        vscode.commands.registerCommand('agm.insertMemory', insertMemory),
        vscode.commands.registerCommand('agm.refreshMemories', () => memoryProvider.refresh()),
        vscode.commands.registerCommand('agm.deleteMemory', deleteMemory)
    ];

    context.subscriptions.push(...commands);

    // Auto-remember on copy (if enabled)
    const config = vscode.workspace.getConfiguration('agm');
    if (config.get('autoRemember')) {
        vscode.env.clipboard.onDidChange(() => {
            // Auto-remember clipboard content if it's code
            autoRememberClipboard();
        });
    }

    async function updateStatusBar() {
        try {
            const { stdout } = await execAsync('agm status');
            const memoryMatch = stdout.match(/Total memories: (\d+)/);
            const memoryCount = memoryMatch ? memoryMatch[1] : '0';
            statusBarItem.text = `🧠 ${memoryCount} memories`;
        } catch (error) {
            statusBarItem.text = '🧠 AGM';
        }
    }

    async function rememberSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        try {
            const context = vscode.workspace.getConfiguration('agm').get('defaultContext', 'vscode');
            await execAsync(`agm remember "${selection.replace(/"/g, '\\"')}" --context "${context}"`);
            vscode.window.showInformationMessage('Memory saved successfully!');
            memoryProvider.refresh();
            updateStatusBar();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
        }
    }

    async function rememberWithContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showErrorMessage('No text selected');
            return;
        }

        const context = await vscode.window.showInputBox({
            prompt: 'Enter context for this memory',
            value: 'vscode'
        });

        if (!context) return;

        try {
            await execAsync(`agm remember "${selection.replace(/"/g, '\\"')}" --context "${context}"`);
            vscode.window.showInformationMessage('Memory saved successfully!');
            memoryProvider.refresh();
            updateStatusBar();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
        }
    }

    async function recallMemories() {
        const query = await vscode.window.showInputBox({
            prompt: 'Search your memories',
            placeHolder: 'Enter search term...'
        });

        if (!query) return;

        try {
            const maxResults = vscode.workspace.getConfiguration('agm').get('maxRecallResults', 10);
            const { stdout } = await execAsync(`agm recall "${query}" --limit ${maxResults}`);
            
            // Show results in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `🧠 AGM Memory Search Results for: "${query}"\n\n${stdout}`,
                language: 'markdown'
            });
            vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to recall memories: ${error}`);
        }
    }

    async function quickRecall() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.document.getText(editor.selection) || 
                        editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
        
        if (!selection) {
            vscode.window.showErrorMessage('No text selected or under cursor');
            return;
        }

        try {
            const { stdout } = await execAsync(`agm recall "${selection}" --limit 5`);
            
            if (stdout.trim()) {
                const doc = await vscode.workspace.openTextDocument({
                    content: `🧠 Quick Recall for: "${selection}"\n\n${stdout}`,
                    language: 'markdown'
                });
                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            } else {
                vscode.window.showInformationMessage('No memories found for the selected text');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to recall memories: ${error}`);
        }
    }

    async function showStatus() {
        try {
            const { stdout } = await execAsync('agm status');
            
            const doc = await vscode.workspace.openTextDocument({
                content: stdout,
                language: 'text'
            });
            vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get status: ${error}`);
        }
    }

    async function initProject() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            await execAsync('agm init --force', { cwd: workspaceFolder.uri.fsPath });
            vscode.window.showInformationMessage('AGM initialized successfully in project!');
            
            // Set context to show the memories view
            vscode.commands.executeCommand('setContext', 'agm.isInitialized', true);
            memoryProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize AGM: ${error}`);
        }
    }

    async function insertMemory(memory: Memory) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, memory.content);
        });
    }

    async function deleteMemory(memory: Memory) {
        const result = await vscode.window.showWarningMessage(
            `Delete memory: ${memory.content.substring(0, 50)}...?`,
            'Delete',
            'Cancel'
        );

        if (result === 'Delete') {
            try {
                // Note: This would require implementing a delete command in the CLI
                // await execAsync(`agm delete ${memory.id}`);
                vscode.window.showInformationMessage('Memory deleted (delete command not yet implemented in CLI)');
                memoryProvider.refresh();
                updateStatusBar();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete memory: ${error}`);
            }
        }
    }

    async function autoRememberClipboard() {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            
            // Only auto-remember if it looks like code (contains common code patterns)
            if (clipboardText && (
                clipboardText.includes('function') ||
                clipboardText.includes('class') ||
                clipboardText.includes('import') ||
                clipboardText.includes('const ') ||
                clipboardText.includes('let ') ||
                clipboardText.includes('var ')
            )) {
                await execAsync(`agm remember "${clipboardText.replace(/"/g, '\\"')}" --context "auto-clipboard"`);
                memoryProvider.refresh();
                updateStatusBar();
            }
        } catch (error) {
            // Silently fail for auto-remember
            console.error('Auto-remember failed:', error);
        }
    }
}

export function deactivate() {
    // Cleanup if needed
}