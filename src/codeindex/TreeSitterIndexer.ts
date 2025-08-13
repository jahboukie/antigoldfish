import * as fs from 'fs';
import * as path from 'path';

export interface TreeSitterSymbolChunk {
    text: string;
    meta: {
        file: string;
        language: string;
        lineStart: number;
        lineEnd: number;
        symbolName?: string;
        symbolType?: string;
        strategy: 'treesitter-fallback' | 'treesitter-ast';
    };
}

/**
 * TreeSitterIndexer - AST-based precise symbol extraction
 * 
 * Uses Tree-sitter parsers for accurate symbol boundary detection
 * in TypeScript, JavaScript, Python, and other languages.
 * 
 * Falls back to heuristic parsing when Tree-sitter is unavailable.
 */
export class TreeSitterIndexer {
    private root: string;
    private parsers: Map<string, any> = new Map();
    private treeSitterAvailable = false;

    constructor(root: string) {
        this.root = root;
        this.initializeParsers();
    }

    private initializeParsers(): void {
        try {
            // Dynamically import Tree-sitter modules
            const Parser = require('tree-sitter');
            
            // Language parsers
            const TypeScript = require('tree-sitter-typescript').typescript;
            const JavaScript = require('tree-sitter-javascript');
            const Python = require('tree-sitter-python');

            // Create parser instances
            const tsParser = new Parser();
            tsParser.setLanguage(TypeScript);
            this.parsers.set('typescript', tsParser);

            const jsParser = new Parser();
            jsParser.setLanguage(JavaScript);
            this.parsers.set('javascript', jsParser);

            const pyParser = new Parser();
            pyParser.setLanguage(Python);
            this.parsers.set('python', pyParser);

            this.treeSitterAvailable = true;
        } catch (error) {
            // Tree-sitter not available, will use fallback
            this.treeSitterAvailable = false;
        }
    }

    isAvailable(): boolean {
        return this.treeSitterAvailable;
    }

    chunkFile(filePath: string): TreeSitterSymbolChunk[] {
        const rel = path.relative(this.root, filePath).replace(/\\/g, '/');
        let content = '';
        
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch {
            return [];
        }

        const language = inferLanguage(filePath);
        const lines = content.split(/\r?\n/);

        // Try Tree-sitter parsing first
        if (this.treeSitterAvailable && this.parsers.has(language)) {
            try {
                return this.parseWithTreeSitter(content, rel, language, lines);
            } catch (error) {
                // Fall back to heuristic if Tree-sitter fails
                console.warn(`Tree-sitter parsing failed for ${rel}, falling back to heuristics`);
            }
        }

        // Fallback: return whole file as one chunk tagged with fallback strategy
        return [{
            text: content,
            meta: {
                file: rel,
                language,
                lineStart: 1,
                lineEnd: lines.length,
                strategy: 'treesitter-fallback'
            }
        }];
    }

    private parseWithTreeSitter(
        content: string, 
        file: string, 
        language: string, 
        lines: string[]
    ): TreeSitterSymbolChunk[] {
        const parser = this.parsers.get(language);
        if (!parser) return [];

        const tree = parser.parse(content);
        const chunks: TreeSitterSymbolChunk[] = [];

        // Extract symbols based on language
        if (language === 'typescript' || language === 'javascript') {
            this.extractJavaScriptSymbols(tree.rootNode, content, file, language, lines, chunks);
        } else if (language === 'python') {
            this.extractPythonSymbols(tree.rootNode, content, file, language, lines, chunks);
        }

        return chunks;
    }

    private extractJavaScriptSymbols(
        node: any,
        content: string,
        file: string,
        language: string,
        lines: string[],
        chunks: TreeSitterSymbolChunk[]
    ): void {
        const symbolTypes = [
            'function_declaration',
            'function_expression',
            'arrow_function',
            'method_definition',
            'class_declaration',
            'interface_declaration',
            'type_alias_declaration',
            'enum_declaration',
            'variable_declarator',
            'export_statement'
        ];

        if (symbolTypes.includes(node.type)) {
            const symbolInfo = this.extractSymbolInfo(node, language);
            if (symbolInfo) {
                const startLine = node.startPosition.row + 1;
                const endLine = node.endPosition.row + 1;
                const symbolText = content.slice(node.startIndex, node.endIndex);

                chunks.push({
                    text: symbolText,
                    meta: {
                        file,
                        language,
                        lineStart: startLine,
                        lineEnd: endLine,
                        symbolName: symbolInfo.name,
                        symbolType: symbolInfo.type,
                        strategy: 'treesitter-ast'
                    }
                });
            }
        }

        // Recursively process child nodes
        for (let i = 0; i < node.childCount; i++) {
            this.extractJavaScriptSymbols(node.child(i), content, file, language, lines, chunks);
        }
    }

    private extractPythonSymbols(
        node: any,
        content: string,
        file: string,
        language: string,
        lines: string[],
        chunks: TreeSitterSymbolChunk[]
    ): void {
        const symbolTypes = [
            'function_definition',
            'class_definition',
            'decorated_definition'
        ];

        if (symbolTypes.includes(node.type)) {
            const symbolInfo = this.extractSymbolInfo(node, language);
            if (symbolInfo) {
                const startLine = node.startPosition.row + 1;
                const endLine = node.endPosition.row + 1;
                const symbolText = content.slice(node.startIndex, node.endIndex);

                chunks.push({
                    text: symbolText,
                    meta: {
                        file,
                        language,
                        lineStart: startLine,
                        lineEnd: endLine,
                        symbolName: symbolInfo.name,
                        symbolType: symbolInfo.type,
                        strategy: 'treesitter-ast'
                    }
                });
            }
        }

        // Recursively process child nodes
        for (let i = 0; i < node.childCount; i++) {
            this.extractPythonSymbols(node.child(i), content, file, language, lines, chunks);
        }
    }

    private extractSymbolInfo(node: any, language: string): { name: string; type: string } | null {
        if (language === 'typescript' || language === 'javascript') {
            switch (node.type) {
                case 'function_declaration':
                case 'function_expression':
                case 'arrow_function':
                case 'method_definition':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'function'
                    };
                case 'class_declaration':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'class'
                    };
                case 'interface_declaration':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'interface'
                    };
                case 'type_alias_declaration':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'type'
                    };
                case 'enum_declaration':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'enum'
                    };
                case 'variable_declarator':
                    const varName = this.findIdentifierName(node);
                    if (varName && this.isConstantObject(node)) {
                        return { name: varName, type: 'object' };
                    }
                    break;
            }
        } else if (language === 'python') {
            switch (node.type) {
                case 'function_definition':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'function'
                    };
                case 'class_definition':
                    return {
                        name: this.findIdentifierName(node) || 'anonymous',
                        type: 'class'
                    };
            }
        }

        return null;
    }

    private findIdentifierName(node: any): string | null {
        // Look for identifier nodes in the immediate children
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child.type === 'identifier' || child.type === 'type_identifier') {
                return child.text;
            }
            // For some constructs, the name might be nested deeper
            if (child.type === 'property_identifier') {
                return child.text;
            }
        }
        return null;
    }

    private isConstantObject(node: any): boolean {
        // Check if this is a const declaration with an object literal
        let parent = node.parent;
        while (parent) {
            if (parent.type === 'variable_declaration') {
                // Check if it's a const declaration
                for (let i = 0; i < parent.childCount; i++) {
                    const child = parent.child(i);
                    if (child.type === 'const' || child.text === 'const') {
                        // Check if the value is an object literal
                        for (let j = 0; j < node.childCount; j++) {
                            const nodeChild = node.child(j);
                            if (nodeChild.type === 'object' || nodeChild.type === 'object_expression') {
                                return true;
                            }
                        }
                    }
                }
                break;
            }
            parent = parent.parent;
        }
        return false;
    }
}

function inferLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts': return 'typescript';
        case '.tsx': return 'typescript';
        case '.js': return 'javascript';
        case '.jsx': return 'javascript';
        case '.py': return 'python';
        case '.go': return 'go';
        case '.java': return 'java';
        default: return ext.replace('.', '') || 'text';
    }
}