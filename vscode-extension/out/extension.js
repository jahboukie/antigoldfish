"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// @ts-nocheck
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
            const { stdout } = await execAsync('smem recall "" --limit 50');
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
                if (currentMemory)
                    memories.push(currentMemory);
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
        if (currentMemory)
            memories.push(currentMemory);
        return memories;
    }
}
function activate(context) {
    // Tree provider and status bar
    const memoryProvider = new MemoryProvider();
    vscode.window.registerTreeDataProvider('smem-memories', memoryProvider);
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'smem.status';
    context.subscriptions.push(statusBarItem);
    // remember selection
    async function rememberSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return vscode.window.showErrorMessage('No active editor');
        const selection = editor.document.getText(editor.selection);
        if (!selection)
            return vscode.window.showErrorMessage('No text selected');
        try {
            const contextKey = vscode.workspace.getConfiguration('smem').get('defaultContext', 'vscode');
            await execAsync(`smem remember "${selection.replace(/"/g, '\\"')}" --context "${contextKey}"`);
            vscode.window.showInformationMessage('Memory saved successfully!');
            memoryProvider.refresh();
            updateStatusBar();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
        }
    }
    // remember with context
    async function rememberWithContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return vscode.window.showErrorMessage('No active editor');
        const selection = editor.document.getText(editor.selection);
        if (!selection)
            return vscode.window.showErrorMessage('No text selected');
        const contextKey = await vscode.window.showInputBox({ prompt: 'Enter context for this memory', value: 'vscode' });
        if (!contextKey)
            return;
        try {
            await execAsync(`smem remember "${selection.replace(/"/g, '\\"')}" --context "${contextKey}"`);
            vscode.window.showInformationMessage('Memory saved successfully!');
            memoryProvider.refresh();
            updateStatusBar();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to save memory: ${error}`);
        }
    }
    // recall query
    async function recallMemories() {
        const query = await vscode.window.showInputBox({ prompt: 'Search your memories', placeHolder: 'Enter search term...' });
        if (!query)
            return;
        try {
            const maxResults = vscode.workspace.getConfiguration('smem').get('maxRecallResults', 10);
            const { stdout } = await execAsync(`smem recall "${query}" --limit ${maxResults}`);
            const doc = await vscode.workspace.openTextDocument({ content: `🛡️ SecuraMem Memory Search Results for: "${query}"\n\n${stdout}`, language: 'markdown' });
            vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to recall memories: ${error}`);
        }
    }
    // quick recall selection
    async function quickRecall() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.document.getText(editor.selection) || editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
        if (!selection)
            return vscode.window.showErrorMessage('No text selected or under cursor');
        try {
            const { stdout } = await execAsync(`smem recall "${selection}" --limit 5`);
            if (stdout.trim()) {
                const doc = await vscode.workspace.openTextDocument({ content: `🛡️ Quick Recall for: "${selection}"\n\n${stdout}`, language: 'markdown' });
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
    // show status
    async function showStatus() {
        try {
            const { stdout } = await execAsync('smem status');
            const doc = await vscode.workspace.openTextDocument({ content: stdout, language: 'text' });
            vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to get status: ${error}`);
        }
    }
    // init project
    async function initProject() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder)
                return vscode.window.showErrorMessage('No workspace folder open');
            await execAsync('smem init --force', { cwd: workspaceFolder.uri.fsPath });
            vscode.window.showInformationMessage('SecuraMem initialized successfully in project!');
            vscode.commands.executeCommand('setContext', 'smem.isInitialized', true);
            memoryProvider.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize SecuraMem: ${error}`);
        }
    }
    // insert selected memory content
    async function insertMemory(memory) {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return vscode.window.showErrorMessage('No active editor');
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, memory.content);
        });
    }
    // delete memory (placeholder)
    async function deleteMemory(_memory) {
        const result = await vscode.window.showWarningMessage('Delete memory?', 'Delete', 'Cancel');
        if (result === 'Delete') {
            vscode.window.showInformationMessage('Memory deleted (not yet implemented)');
            memoryProvider.refresh();
            updateStatusBar();
        }
    }
    // auto remember clipboard
    async function autoRememberClipboard() {
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            if (clipboardText && (clipboardText.includes('function') ||
                clipboardText.includes('class') ||
                clipboardText.includes('import') ||
                clipboardText.includes('const ') ||
                clipboardText.includes('let ') ||
                clipboardText.includes('var '))) {
                await execAsync(`smem remember "${clipboardText.replace(/"/g, '\\"')}" --context "auto-clipboard"`);
                memoryProvider.refresh();
                updateStatusBar();
            }
        }
        catch (error) {
            console.error('Auto-remember failed:', error);
        }
    }
    // status bar
    let pollTimer;
    async function updateStatusBar() {
        try {
            const cfg = vscode.workspace.getConfiguration('smem');
            const showOffline = cfg.get('showOfflineIndicator', true);
            let memoryText = '';
            try {
                const { stdout } = await execAsync('smem status');
                const memoryMatch = stdout.match(/Total memories: (\d+)/);
                const memoryCount = memoryMatch ? memoryMatch[1] : '0';
                memoryText = `🛡️ ${memoryCount}`;
            }
            catch {
                memoryText = '🛡️';
            }
            let offlineText = '';
            let tooltip = 'SecuraMem';
            if (showOffline) {
                try {
                    const { stdout: j } = await execAsync('smem prove-offline --json');
                    const obj = JSON.parse(j);
                    const proof = obj?.offlineProof || {};
                    const egress = String(proof.policyNetworkEgress || 'unknown');
                    const guard = proof.networkGuardActive ? 'active' : 'inactive';
                    const proxies = proof.proxiesPresent ? 'proxies: present' : 'proxies: none';
                    const locked = egress === 'blocked';
                    offlineText = locked ? '🔒' : '🌐';
                    tooltip = `SecuraMem • ${locked ? 'offline (no egress)' : 'egress allowed'} • guard=${guard} • ${proxies}`;
                }
                catch {
                    offlineText = '';
                }
            }
            statusBarItem.text = `${memoryText}${offlineText ? ' ' + offlineText : ''}`;
            statusBarItem.tooltip = tooltip;
        }
        catch {
            statusBarItem.text = '🛡️ SecuraMem';
            statusBarItem.tooltip = 'SecuraMem';
        }
    }
    const refreshFromConfig = () => {
        const cfg = vscode.workspace.getConfiguration('smem');
        const show = cfg.get('showStatusBar', true);
        if (show)
            statusBarItem.show();
        else
            statusBarItem.hide();
        const intervalMs = Math.max(5, Number(cfg.get('offlinePollInterval', 60))) * 1000;
        if (pollTimer)
            clearInterval(pollTimer);
        updateStatusBar().catch(() => { });
        pollTimer = setInterval(() => { updateStatusBar().catch(() => { }); }, intervalMs);
        context.subscriptions.push({ dispose: () => pollTimer && clearInterval(pollTimer) });
    };
    refreshFromConfig();
    // register commands
    const commands = [
        vscode.commands.registerCommand('smem.remember', rememberSelection),
        vscode.commands.registerCommand('smem.rememberWithContext', rememberWithContext),
        vscode.commands.registerCommand('smem.recall', recallMemories),
        vscode.commands.registerCommand('smem.quickRecall', quickRecall),
        vscode.commands.registerCommand('smem.status', showStatus),
        vscode.commands.registerCommand('smem.init', initProject),
        vscode.commands.registerCommand('smem.insertMemory', insertMemory),
        vscode.commands.registerCommand('smem.refreshMemories', () => memoryProvider.refresh()),
        vscode.commands.registerCommand('smem.deleteMemory', deleteMemory)
    ];
    context.subscriptions.push(...commands);
    // auto-remember clipboard polling
    const config = vscode.workspace.getConfiguration('smem');
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
}
function deactivate() {
    // Cleanup if needed
}
//# sourceMappingURL=extension.js.map