"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class MemoryProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.memories = [];
        this.refresh();
    }
    refresh() {
        this.loadMemories();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        const item = new vscode.TreeItem(element.content.substring(0, 50) + '...', vscode.TreeItemCollapsibleState.None);
        item.tooltip = `${element.content}\nContext: ${element.context}\nType: ${element.type}\nDate: ${element.date}`;
        item.description = `[${element.context}] ${element.date}`;
        item.contextValue = 'memory';
        return item;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.memories);
        }
        return Promise.resolve([]);
    }
    async loadMemories() {
        try {
            const { stdout } = await execAsync('agm recall "" --limit 50');
            // Parse the AGM output to extract memories
            // This is a simplified parser - you might need to adjust based on actual output format
            this.memories = this.parseMemoriesFromOutput(stdout);
        }
        catch (error) {
            console.error('Failed to load memories:', error);
            this.memories = [];
        }
    }
    parseMemoriesFromOutput(output) {
        const memories = [];
        const lines = output.split('\n');
        let currentMemory = null;
        for (const line of lines) {
            if (line.includes('Memory ID:')) {
                if (currentMemory) {
                    memories.push(currentMemory);
                }
                currentMemory = {
                    id: line.split('Memory ID:')[1]?.trim() || '',
                    content: '',
                    context: 'general',
                    type: 'general',
                    date: new Date().toISOString().split('T')[0]
                };
            }
            else if (line.includes('Date:') && currentMemory) {
                currentMemory.date = line.split('Date:')[1]?.trim() || '';
            }
            else if (line.includes('Relevance:') && currentMemory) {
                const relevanceStr = line.split('Relevance:')[1]?.trim().replace('%', '');
                currentMemory.relevance = parseFloat(relevanceStr || '0');
            }
            else if (line.includes('Content:') && currentMemory) {
                currentMemory.content = line.split('Content:')[1]?.trim() || '';
            }
        }
        if (currentMemory) {
            memories.push(currentMemory);
        }
        return memories;
    }
}
function activate(context) {
    const memoryProvider = new MemoryProvider();
    // Register tree data provider
    vscode.window.registerTreeDataProvider('agm-memories', memoryProvider);
    // Status bar item (memory count + offline indicator)
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'agm.status';
    context.subscriptions.push(statusBarItem);
    let pollTimer;
    const refreshFromConfig = () => {
        const cfg = vscode.workspace.getConfiguration('agm');
        const show = cfg.get('showStatusBar', true);
        if (show) {
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
        const intervalMs = Math.max(5, Number(cfg.get('offlinePollInterval', 60))) * 1000;
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        // Initial paint
        updateStatusBar().catch(() => { });
        pollTimer = setInterval(() => { updateStatusBar().catch(() => { }); }, intervalMs);
        context.subscriptions.push({ dispose: () => pollTimer && clearInterval(pollTimer) });
    };
    refreshFromConfig();
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
    // Auto-remember on copy (if enabled) via lightweight polling
    const config = vscode.workspace.getConfiguration('agm');
    if (config.get('autoRemember')) {
        let lastClip = '';
        const clipTimer = setInterval(async () => {
            try {
                const cur = await vscode.env.clipboard.readText();
                if (cur && cur !== lastClip) {
                    lastClip = cur;
                    await autoRememberClipboard();
                }
            }
            catch { }
        }, 2000);
        context.subscriptions.push({ dispose: () => clearInterval(clipTimer) });
    }
    async function updateStatusBar() {
        try {
            const cfg = vscode.workspace.getConfiguration('agm');
            const showOffline = cfg.get('showOfflineIndicator', true);
            // Get memory count
            let memoryText = '';
            try {
                const { stdout } = await execAsync('agm status');
                const memoryMatch = stdout.match(/Total memories: (\d+)/);
                const memoryCount = memoryMatch ? memoryMatch[1] : '0';
                memoryText = `🧠 ${memoryCount}`;
            }
            catch {
                memoryText = '🧠';
            }
            // Get offline proof
            let offlineText = '';
            let tooltip = 'AGM';
            if (showOffline) {
                try {
                    const { stdout: j } = await execAsync('agm prove-offline --json');
                    const obj = JSON.parse(j);
                    const proof = obj?.offlineProof || {};
                    const egress = String(proof.policyNetworkEgress || 'unknown');
                    const guard = proof.networkGuardActive ? 'active' : 'inactive';
                    const proxies = proof.proxiesPresent ? 'proxies: present' : 'proxies: none';
                    const locked = egress === 'blocked';
                    offlineText = locked ? '🔒' : '🌐';
                    tooltip = `AGM • ${locked ? 'offline (no egress)' : 'egress allowed'} • guard=${guard} • ${proxies}`;
                }
                catch {
                    offlineText = '';
                }
            }
            statusBarItem.text = `${memoryText}${offlineText ? ' ' + offlineText : ''}`;
            statusBarItem.tooltip = tooltip;
        }
        catch {
            statusBarItem.text = '🧠 AGM';
            statusBarItem.tooltip = 'AGM';
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
        }
        catch (error) {
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
        if (!context)
            return;
        try {
            await execAsync(`agm remember "${selection.replace(/"/g, '\\"')}" --context "${context}"`);
            vscode.window.showInformationMessage('Memory saved successfully!');
            memoryProvider.refresh();
            updateStatusBar();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
        }
    }
    async function recallMemories() {
        const query = await vscode.window.showInputBox({
            prompt: 'Search your memories',
            placeHolder: 'Enter search term...'
        });
        if (!query)
            return;
        try {
            const maxResults = vscode.workspace.getConfiguration('agm').get('maxRecallResults', 10);
            const { stdout } = await execAsync(`agm recall "${query}" --limit ${maxResults}`);
            // Show results in a new document
            const doc = await vscode.workspace.openTextDocument({
                content: `🧠 AGM Memory Search Results for: "${query}"\n\n${stdout}`,
                language: 'markdown'
            });
            vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to recall memories: ${error}`);
        }
    }
    async function quickRecall() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
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
            }
            else {
                vscode.window.showInformationMessage('No memories found for the selected text');
            }
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize AGM: ${error}`);
        }
    }
    async function insertMemory(memory) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, memory.content);
        });
    }
    async function deleteMemory(memory) {
        const result = await vscode.window.showWarningMessage(`Delete memory: ${memory.content.substring(0, 50)}...?`, 'Delete', 'Cancel');
        if (result === 'Delete') {
            try {
                // Note: This would require implementing a delete command in the CLI
                // await execAsync(`agm delete ${memory.id}`);
                vscode.window.showInformationMessage('Memory deleted (delete command not yet implemented in CLI)');
                memoryProvider.refresh();
                updateStatusBar();
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to delete memory: ${error}`);
            }
        }
    }
    async function autoRememberClipboard() {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            // Only auto-remember if it looks like code (contains common code patterns)
            if (clipboardText && (clipboardText.includes('function') ||
                clipboardText.includes('class') ||
                clipboardText.includes('import') ||
                clipboardText.includes('const ') ||
                clipboardText.includes('let ') ||
                clipboardText.includes('var '))) {
                await execAsync(`agm remember "${clipboardText.replace(/"/g, '\\"')}" --context "auto-clipboard"`);
                memoryProvider.refresh();
                updateStatusBar();
            }
        }
        catch (error) {
            // Silently fail for auto-remember
            console.error('Auto-remember failed:', error);
        }
    }
}
function deactivate() {
    // Cleanup if needed
}
//# sourceMappingURL=extension.js.map