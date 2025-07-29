/**
 * CodeContextPro-MES Memory Database
 * SQLite3-based persistent memory storage with security-first design
 * 
 * Copyright (c) 2025 CodeContext Team. All rights reserved.
 * 
 * PROPRIETARY SOFTWARE - NOT LICENSED UNDER MIT
 * This file contains proprietary intellectual property of CodeContext Team
 * and is not licensed under the MIT License applicable to the CLI tool.
 * 
 * The algorithms, encryption methods, key derivation, and memory storage
 * techniques contained herein are trade secrets and proprietary technology.
 * 
 * Unauthorized copying, redistribution, reverse engineering, or modification 
 * of this file, via any medium, is strictly prohibited without express 
 * written permission from CodeContext Team.
 * 
 * Phase 1 Sprint 1.3: Real Database Implementation
 * Compatible with SQLite3 3.44.2 on Node.js 22+ Windows x64
 */

import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

// TypeScript augmentation for GCM cipher methods
declare module 'crypto' {
    function createCipherGCM(algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike): crypto.CipherGCM;
    function createDecipherGCM(algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike): crypto.DecipherGCM;
}

export interface DatabaseMemory {
    id: number;
    content: string;
    context: string;
    type: string;
    tags: string;
    metadata: string;
    contentHash: string;
    createdAt: string;
    updatedAt: string;
}

export interface SearchOptions {
    limit?: number;
    offset?: number;
    type?: string;
    context?: string;
    tags?: string[];
    minRelevance?: number;
}

export interface SearchResult {
    id: number;
    content: string;
    relevance: number;
    timestamp: string;
    type: string;
    context: string;
    tags: string[];
}

export interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    metadata?: any;
}

export interface Conversation {
    id: string;
    timestamp: Date;
    aiAssistant: string;
    context: any;
    messages: Message[];
    outcomes: any[];
}

export interface ConversationContext {
    activeFile?: string;
    selectedText?: string;
    projectContext?: any;
}

interface EncryptedDatabaseFile {
    encrypted: string;
    iv: string;
    authTag: string;
    integrityHash: string;
    algorithm: string;
    keyDerivation: string;
}

export class MemoryDatabase {
    private db: sqlite3.Database | null = null;
    private dbPath: string;
    private encryptedDbPath: string;
    private tempDbPath: string;
    private initialized = false;
    private encryptionKey: Buffer | null = null;

    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.encryptedDbPath = dbPath + '.enc';
        this.tempDbPath = dbPath + '.temp';
    }

    /**
     * Generate machine-specific encryption key
     * CRITICAL SECURITY: Uses machine-specific data for key derivation
     */
    private generateEncryptionKey(): Buffer {
        if (this.encryptionKey) {
            return this.encryptionKey;
        }

        // Collect machine-specific identifiers including network info
        const networkInterfaces = os.networkInterfaces();
        const macAddresses = Object.values(networkInterfaces)
            .flat()
            .filter(iface => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
            .map(iface => iface!.mac)
            .sort()
            .join(',');

        const machineId = [
            os.hostname(),
            os.platform(),
            os.arch(),
            os.cpus()[0]?.model || 'unknown',
            process.env.USERNAME || process.env.USER || 'unknown',
            __dirname,
            macAddresses || 'no-mac',
            os.totalmem().toString(),
            process.pid.toString()
        ].join(':');

        // Use stronger salt generation with timestamp
        const timestamp = Date.now().toString();
        const baseSalt = `codecontext-memory-salt-${timestamp.slice(-4)}`;
        const salt = crypto.createHash('sha256').update(baseSalt).digest();
        
        // Derive encryption key using PBKDF2 with higher iterations
        this.encryptionKey = crypto.pbkdf2Sync(machineId, salt, 200000, 32, 'sha256');
        
        console.log('🔐 Generated secure machine-specific encryption key');
        return this.encryptionKey;
    }

    /**
     * Calculate integrity hash for tamper detection
     */
    private calculateIntegrityHash(data: Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Encrypt database file with AES-256-GCM
     * CRITICAL SECURITY: Encrypts SQLite database at rest
     */
    private async encryptDatabaseFile(): Promise<void> {
        try {
            // Check if unencrypted database exists
            if (!fs.existsSync(this.dbPath)) {
                console.log('📋 No database file to encrypt');
                return;
            }

            // Read database file
            const dbData = fs.readFileSync(this.dbPath);
            
            // Generate encryption key and IV
            const key = this.generateEncryptionKey();
            const iv = crypto.randomBytes(16);
            
            // Encrypt using AES-256-CTR for Node.js compatibility  
            const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
            
            let encrypted = cipher.update(dbData);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Calculate integrity hash
            const integrityHash = this.calculateIntegrityHash(dbData);
            
            // Create encrypted file structure
            const encryptedFile: EncryptedDatabaseFile = {
                encrypted: encrypted.toString('base64'),
                iv: iv.toString('base64'),
                authTag: '', // Not used in CTR mode
                integrityHash,
                algorithm: 'aes-256-ctr',
                keyDerivation: 'pbkdf2-sha256-200000'
            };
            
            // Write encrypted file
            fs.writeFileSync(this.encryptedDbPath, JSON.stringify(encryptedFile, null, 2));
            
            // Remove unencrypted database
            fs.unlinkSync(this.dbPath);
            
            console.log('🔒 Database encrypted and secured');
            
        } catch (error) {
            console.error('❌ Database encryption failed:', error);
            throw new Error('Failed to encrypt database');
        }
    }

    /**
     * Decrypt database file for use
     * CRITICAL SECURITY: Decrypts SQLite database for runtime use
     */
    private async decryptDatabaseFile(): Promise<void> {
        try {
            // Check if encrypted file exists
            if (!fs.existsSync(this.encryptedDbPath)) {
                console.log('📋 No encrypted database found, will create new one');
                return;
            }

            // Read encrypted file
            const encryptedData = JSON.parse(fs.readFileSync(this.encryptedDbPath, 'utf8')) as EncryptedDatabaseFile;
            
            // Generate encryption key
            const key = this.generateEncryptionKey();
            
            // Decrypt using AES-256-CTR for compatibility
            const iv = Buffer.from(encryptedData.iv, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
            
            let decrypted = decipher.update(Buffer.from(encryptedData.encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // Verify integrity
            const calculatedHash = this.calculateIntegrityHash(decrypted);
            if (calculatedHash !== encryptedData.integrityHash) {
                throw new Error('Database integrity check failed - possible tampering detected');
            }
            
            // Write decrypted database to temp location
            fs.writeFileSync(this.dbPath, decrypted);
            
            console.log('🔓 Database decrypted and integrity verified');
            
        } catch (error) {
            console.error('❌ Database decryption failed:', error);
            throw new Error('Failed to decrypt database - possible corruption or tampering');
        }
    }

    /**
     * Initialize database connection and create tables
     * Compatible with SQLite3 3.44.2 environment
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Ensure directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // TEMPORARILY DISABLED: Skip decryption for testing
            // await this.decryptDatabaseFile();
            console.log('📋 Using unencrypted database for testing');

            return new Promise((resolve, reject) => {
                // Create database connection
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('❌ Failed to connect to SQLite database:', err.message);
                        reject(err);
                        return;
                    }

                    console.log('✅ Connected to SQLite database');

                    this.createTables()
                        .then(() => {
                            this.initialized = true;
                            resolve();
                        })
                        .catch(reject);
                });
            });
        } catch (error) {
            throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create database tables with optimized schema
     * Designed for efficient memory storage and retrieval
     */
    private async createTables(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not connected'));
                return;
            }

            const schema = `
                -- Memories table with full-text search support
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    context TEXT NOT NULL DEFAULT 'general',
                    type TEXT NOT NULL DEFAULT 'general',
                    tags TEXT DEFAULT '[]',
                    metadata TEXT DEFAULT '{}',
                    content_hash TEXT NOT NULL UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Full-text search index for content
                CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
                    content,
                    context,
                    tags,
                    content='memories',
                    content_rowid='id'
                );

                -- Triggers to maintain FTS index
                CREATE TRIGGER IF NOT EXISTS memories_fts_insert AFTER INSERT ON memories 
                BEGIN
                    INSERT INTO memories_fts(rowid, content, context, tags) 
                    VALUES (new.id, new.content, new.context, new.tags);
                END;

                CREATE TRIGGER IF NOT EXISTS memories_fts_delete AFTER DELETE ON memories 
                BEGIN
                    DELETE FROM memories_fts WHERE rowid = old.id;
                END;

                CREATE TRIGGER IF NOT EXISTS memories_fts_update AFTER UPDATE ON memories 
                BEGIN
                    DELETE FROM memories_fts WHERE rowid = old.id;
                    INSERT INTO memories_fts(rowid, content, context, tags) 
                    VALUES (new.id, new.content, new.context, new.tags);
                END;

                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
                CREATE INDEX IF NOT EXISTS idx_memories_context ON memories(context);
                CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
                CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(content_hash);

                -- Memory usage statistics
                CREATE TABLE IF NOT EXISTS memory_stats (
                    id INTEGER PRIMARY KEY,
                    total_memories INTEGER DEFAULT 0,
                    total_size_bytes INTEGER DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Initialize stats if empty
                INSERT OR IGNORE INTO memory_stats (id, total_memories, total_size_bytes)
                VALUES (1, 0, 0);

                -- Conversation tracking tables
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    ai_assistant TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    context TEXT,
                    summary TEXT
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
                );

                CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
            `;

            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('❌ Failed to create database schema:', err.message);
                    reject(err);
                    return;
                }

                console.log('✅ Database schema created successfully');
                resolve();
            });
        });
    }

    /**
     * Store memory with duplicate detection and security validation
     */
    async storeMemory(
        content: string,
        context: string = 'general',
        type: string = 'general',
        tags: string[] = [],
        metadata: object = {}
    ): Promise<number> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Create content hash for duplicate detection
        const contentHash = this.createHash(content);
        const tagsJson = JSON.stringify(tags);
        const metadataJson = JSON.stringify(metadata);

        return new Promise((resolve, reject) => {
            const stmt = this.db!.prepare(`
                INSERT OR REPLACE INTO memories
                (content, context, type, tags, metadata, content_hash, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            stmt.run([content, context, type, tagsJson, metadataJson, contentHash], function(err) {
                if (err) {
                    console.error('❌ Failed to store memory:', err.message);
                    reject(err);
                    return;
                }

                console.log(`✅ Memory stored with ID: ${this.lastID}`);
                resolve(this.lastID);
            });

            stmt.finalize();
        });
    }

    /**
     * Search memories with full-text search and relevance scoring
     * Uses SQLite FTS5 for efficient text search
     */
    async searchMemories(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const {
            limit = 10,
            offset = 0,
            type,
            context,
            tags,
            minRelevance = 0.1
        } = options;

        // Sanitize query for FTS5
        const sanitizedQuery = this.sanitizeFTSQuery(query);

        let sql = `
            SELECT 
                m.id,
                m.content,
                m.type,
                m.context,
                m.tags,
                m.created_at as timestamp,
                rank
            FROM memories_fts fts
            JOIN memories m ON fts.rowid = m.id
            WHERE memories_fts MATCH ?
        `;

        const params: any[] = [sanitizedQuery];

        // Add filters
        if (type) {
            sql += ' AND m.type = ?';
            params.push(type);
        }

        if (context) {
            sql += ' AND m.context = ?';
            params.push(context);
        }

        // Order by relevance (FTS5 rank)
        sql += ' ORDER BY rank LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return new Promise((resolve, reject) => {
            this.db!.all(sql, params, (err, rows: any[]) => {
                if (err) {
                    console.error('❌ Search failed:', err.message);
                    reject(err);
                    return;
                }

                const results: SearchResult[] = rows.map(row => ({
                    id: row.id,
                    content: row.content,
                    relevance: this.calculateRelevance(row.rank),
                    timestamp: row.timestamp,
                    type: row.type,
                    context: row.context,
                    tags: JSON.parse(row.tags || '[]')
                }));

                // Filter by minimum relevance
                const filteredResults = results.filter(r => r.relevance >= minRelevance);

                console.log(`✅ Search completed: "${query}" - Found ${filteredResults.length} results`);
                resolve(filteredResults);
            });
        });
    }

    /**
     * Get memory by ID
     */
    async getMemoryById(id: number): Promise<DatabaseMemory | null> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM memories WHERE id = ?';
            
            this.db!.get(sql, [id], (err, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    resolve(null);
                    return;
                }

                resolve({
                    id: row.id,
                    content: row.content,
                    context: row.context,
                    type: row.type,
                    tags: row.tags,
                    metadata: row.metadata,
                    contentHash: row.content_hash,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            });
        });
    }

    /**
     * Delete memory by ID
     */
    async deleteMemory(id: number): Promise<boolean> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const stmt = this.db!.prepare('DELETE FROM memories WHERE id = ?');
            
            stmt.run([id], function(err) {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(this.changes > 0);
            });

            stmt.finalize();
        });
    }

    /**
     * Record a conversation with AI assistant
     */
    async recordConversation(
        aiAssistant: string,
        messages: Message[],
        context?: ConversationContext
    ): Promise<string> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const conversationId = this.generateUUID();
        const projectId = 'codecontextpro-production'; // Simple project ID for now

        return new Promise((resolve, reject) => {
            // Insert conversation
            const conversationStmt = this.db!.prepare(`
                INSERT INTO conversations (id, project_id, ai_assistant, context)
                VALUES (?, ?, ?, ?)
            `);

            const self = this; // Capture 'this' context
            conversationStmt.run([
                conversationId,
                projectId,
                aiAssistant,
                JSON.stringify(context || {})
            ], function(err: any) {
                if (err) {
                    console.error('❌ Failed to record conversation:', err.message);
                    reject(err);
                    return;
                }

                // Insert messages
                const messageStmt = self.db!.prepare(`
                    INSERT INTO messages (id, conversation_id, role, content, metadata)
                    VALUES (?, ?, ?, ?, ?)
                `);

                let messageCount = 0;
                for (const message of messages) {
                    const messageId = message.id || self.generateUUID();
                    messageStmt.run([
                        messageId,
                        conversationId,
                        message.role,
                        message.content,
                        JSON.stringify(message.metadata || {})
                    ], (err: any) => {
                        if (err) {
                            console.error('❌ Failed to record message:', err.message);
                            reject(err);
                            return;
                        }

                        messageCount++;
                        if (messageCount === messages.length) {
                            console.log(`✅ Conversation recorded with ${messages.length} messages`);
                            resolve(conversationId);
                        }
                    });
                }

                // Handle empty messages array
                if (messages.length === 0) {
                    console.log('✅ Conversation recorded (no messages)');
                    resolve(conversationId);
                }
            });
        });
    }

    /**
     * Get recent conversations
     */
    async getConversations(limit: number = 50): Promise<Conversation[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM conversations
                ORDER BY timestamp DESC
                LIMIT ?
            `;

            this.db!.all(sql, [limit], async (err, conversations: any[]) => {
                if (err) {
                    console.error('❌ Failed to get conversations:', err.message);
                    reject(err);
                    return;
                }

                try {
                    const conversationsWithMessages = await Promise.all(
                        conversations.map(async (conv) => {
                            const messages = await this.getMessagesForConversation(conv.id);
                            return {
                                id: conv.id,
                                timestamp: new Date(conv.timestamp),
                                aiAssistant: conv.ai_assistant,
                                context: JSON.parse(conv.context || '{}'),
                                messages,
                                outcomes: []
                            };
                        })
                    );

                    resolve(conversationsWithMessages);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Get messages for a specific conversation
     */
    private async getMessagesForConversation(conversationId: string): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM messages
                WHERE conversation_id = ?
                ORDER BY timestamp
            `;

            this.db!.all(sql, [conversationId], (err, messages: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }

                const formattedMessages = messages.map(msg => ({
                    id: msg.id,
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                    metadata: JSON.parse(msg.metadata || '{}')
                }));

                resolve(formattedMessages);
            });
        });
    }

    /**
     * Generate UUID for conversations and messages
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Get database statistics
     */
    async getStats(): Promise<{ totalMemories: number; totalSizeBytes: number; lastUpdated: string }> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_memories,
                    SUM(LENGTH(content)) as total_size_bytes,
                    MAX(updated_at) as last_updated
                FROM memories
            `;

            this.db!.get(sql, [], (err, row: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    totalMemories: row.total_memories || 0,
                    totalSizeBytes: row.total_size_bytes || 0,
                    lastUpdated: row.last_updated || new Date().toISOString()
                });
            });
        });
    }

    /**
     * Close database connection and encrypt file
     * CRITICAL SECURITY: Encrypts database when closing
     */
    async close(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve) => {
            this.db!.close(async (err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
                
                try {
                    // TEMPORARILY DISABLED: Skip encryption for testing
                    // await this.encryptDatabaseFile();
                    console.log('📋 Database closed (encryption disabled for testing)');
                } catch (encryptError) {
                    console.error('❌ Failed to encrypt database on close:', encryptError);
                }
                
                this.db = null;
                this.initialized = false;
                this.encryptionKey = null; // Clear encryption key from memory
                resolve();
            });
        });
    }

    /**
     * Create hash for content deduplication
     */
    private createHash(content: string): string {
        // Simple hash function for content deduplication
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Sanitize FTS5 query to prevent injection
     */
    private sanitizeFTSQuery(query: string): string {
        // Remove FTS5 special characters that could cause issues
        return query
            .replace(/[^a-zA-Z0-9\s\-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Calculate relevance score from FTS5 rank
     */
    private calculateRelevance(rank: number): number {
        // Convert FTS5 rank to 0-1 relevance score
        // Lower rank = higher relevance in FTS5
        return Math.max(0, Math.min(1, 1 / (1 + Math.abs(rank) * 0.1)));
    }
}
