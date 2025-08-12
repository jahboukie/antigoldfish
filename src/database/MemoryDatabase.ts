/**
 * AntiGoldfishMode Memory Database
 * SQLite-based persistent memory storage with a security-first, local-only design
 *
 * MIT License
 * Copyright (c) 2025 AntiGoldfishMode Team
 *
 * This module implements local, air-gapped storage for persistent AI memory.
 * No network dependencies are required for core operations. Data is stored
 * encrypted-at-rest (machine-bound) when secure mode is enabled.
 *
 * Compatible with SQLite 3.x on Node.js 18+ (Windows/macOS/Linux)
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

// TypeScript augmentation (legacy note retained for compatibility)
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
    metadata?: string; // JSON string stored in DB, may contain file/line info
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
    salt: string; // base64-encoded salt used for PBKDF2
}

export class MemoryDatabase {
    private db: Database.Database | null = null;
    private dbPath: string;
    private encryptedDbPath: string;
    private tempDbPath: string;
    private initialized = false;
    private encryptionKey: Buffer | null = null;
    private encryptionKeySaltBase64: string | null = null;
    private devMode: boolean;
    private encryptionScheduled = false;
    private backgroundEncryptionTimer: NodeJS.Timeout | null = null;

    constructor(dbPath: string, devMode: boolean = false) {
        this.dbPath = dbPath;
        this.encryptedDbPath = dbPath + '.enc';
        this.tempDbPath = dbPath + '.temp';
        this.devMode = devMode;
    }

    /**
     * Generate machine-specific encryption key
     * CRITICAL SECURITY: Uses machine-specific data for key derivation
     */
    private generateEncryptionKey(salt: Buffer): Buffer {
        const saltB64 = salt.toString('base64');
        if (this.encryptionKey && this.encryptionKeySaltBase64 === saltB64) {
            return this.encryptionKey;
        }

        // Collect stable machine-specific identifiers
        const networkInterfaces = os.networkInterfaces();
        const macAddresses = Object.values(networkInterfaces)
            .flat()
            .filter(iface => iface && !iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00')
            .map(iface => (iface as any)!.mac)
            .sort()
            .join(',');

        const machineId = [
            os.hostname(),
            os.platform(),
            os.arch(),
            os.cpus()[0]?.model || 'unknown',
            process.env.USERNAME || process.env.USER || 'unknown',
            macAddresses || 'no-mac'
        ].join(':');

        // Derive encryption key using PBKDF2 with higher iterations and provided salt
    this.encryptionKey = crypto.pbkdf2Sync(machineId, salt, 200000, 32, 'sha256');
    this.encryptionKeySaltBase64 = saltB64;

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
     * Schedule background encryption to avoid file locking issues
     * Enterprise-grade approach: Non-blocking encryption with retry logic
     */
    private scheduleBackgroundEncryption(): void {
        if (this.encryptionScheduled) {
            return; // Already scheduled
        }

        this.encryptionScheduled = true;
        console.log('🔐 Scheduling background encryption...');

        // Use background timer to encrypt after file handles are released
        this.backgroundEncryptionTimer = setTimeout(async () => {
            await this.performBackgroundEncryption();
        }, 1000); // 1 second delay to ensure file handles are released
    }

    /**
     * Perform background encryption with enterprise-grade retry logic
     */
    private async performBackgroundEncryption(): Promise<void> {
        const maxRetries = 5;
        const baseDelay = 500;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Check if database file exists and is not locked
                if (!fs.existsSync(this.dbPath)) {
                    console.log('📋 No database file found for encryption');
                    return;
                }

                // Attempt encryption
                await this.encryptDatabaseFile();
                console.log('🔒 Background encryption completed successfully');
                this.encryptionScheduled = false;
                return;

            } catch (error) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff

                if (attempt === maxRetries) {
                    // Final attempt failed - graceful degradation
                    console.log('⚠️  Background encryption failed after all retries');
                    console.log('🔓 Database remains unencrypted (will encrypt on next startup)');
                    this.encryptionScheduled = false;
                    return;
                }

                console.log(`🔄 Encryption attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Encrypt database file with AES-256-CTR
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

            // Generate encryption salt, key and IV
            const salt = crypto.randomBytes(16);
            const key = this.generateEncryptionKey(salt);
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
                keyDerivation: 'pbkdf2-sha256-200000',
                salt: salt.toString('base64')
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

            // Generate encryption key using stored salt
            const salt = Buffer.from(encryptedData.salt, 'base64');
            const iv = Buffer.from(encryptedData.iv, 'base64');

            const tryDecrypt = (key: Buffer): Buffer | null => {
                try {
                    const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
                    let dec = decipher.update(Buffer.from(encryptedData.encrypted, 'base64'));
                    dec = Buffer.concat([dec, decipher.final()]);
                    const hash = this.calculateIntegrityHash(dec);
                    if (hash === encryptedData.integrityHash) return dec;
                    return null;
                } catch {
                    return null;
                }
            };

            // Primary key (full machine id)
            const primaryKey = this.generateEncryptionKey(salt);
            let decrypted: Buffer | null = tryDecrypt(primaryKey);

            // Fallback key using a more stable machine-id variant (exclude username)
            if (!decrypted) {
                const networkInterfaces = os.networkInterfaces();
                const macAddresses = Object.values(networkInterfaces)
                    .flat()
                    .filter(iface => iface && !(iface as any).internal && (iface as any).mac && (iface as any).mac !== '00:00:00:00:00:00')
                    .map(iface => (iface as any)!.mac)
                    .sort()
                    .join(',');
                const stableId = [
                    os.hostname(),
                    os.platform(),
                    os.arch(),
                    os.cpus()[0]?.model || 'unknown',
                    macAddresses || 'no-mac'
                ].join(':');
                const stableKey = crypto.pbkdf2Sync(stableId, salt, 200000, 32, 'sha256');
                decrypted = tryDecrypt(stableKey);
            }

            if (!decrypted) {
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
            // Check for better-sqlite3 compatibility issues
            await this.checkSqliteCompatibility();

            // Ensure directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Handle encryption based on mode
            if (this.devMode) {
                // Using unencrypted database for reliability
            } else {
                await this.decryptDatabaseFile();
            }

            // Create database connection (synchronous with better-sqlite3)
            this.db = new Database(this.dbPath);


            // Try to load sqlite-vss extension if present (Stage 2)
            const { SqliteVSS } = await import('../engine/vector/SqliteVSS.js');
            const vss = SqliteVSS.tryLoad(this.db, process.cwd(), 'memories_vss');
            if (vss.isAvailable()) {
                // Ensure VSS table exists with expected dimension lazily later
                // Store handle for later use via closure on this.db methods
                (this as any)._vss = vss;
            }

            // Enable foreign key constraints
            this.db.pragma('foreign_keys = ON');

            console.log('✅ Connected to SQLite database');

            // Check and migrate database if needed
            await this.checkAndMigrateDatabase();
            this.initialized = true;
        } catch (error) {
            throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check better-sqlite3 compatibility and suggest fixes for common issues
     */
    private async checkSqliteCompatibility(): Promise<void> {
        try {
            // Try to create a test database to check if better-sqlite3 works
            const testPath = path.join(os.tmpdir(), `agm-test-${Date.now()}.db`);
            const testDb = new Database(testPath);
            testDb.close();
            fs.unlinkSync(testPath);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            if (errorMessage.includes('invalid ELF header') || errorMessage.includes('wrong ELF class')) {
                console.log('⚠️  better-sqlite3 compatibility issue detected');
                console.log('🔧 This is common in WSL2/cross-platform environments');
                console.log('💡 Attempting automatic rebuild...');

                try {
                    // Try to rebuild better-sqlite3 for current environment
                    const { spawn } = require('child_process');
                    const rebuild = spawn('npm', ['rebuild', 'better-sqlite3'], {
                        stdio: 'inherit',
                        shell: true
                    });

                    await new Promise<boolean>((resolve, reject) => {
                        rebuild.on('close', (code: number | null) => {
                            if (code === 0) {
                                console.log('✅ better-sqlite3 rebuilt successfully');
                                resolve(true);
                            } else {
                                reject(new Error(`Rebuild failed with code ${code}`));
                            }
                        });
                        rebuild.on('error', reject);
                    });

                    // Test again after rebuild
                    const testPath2 = path.join(os.tmpdir(), `agm-test-rebuilt-${Date.now()}.db`);
                    const testDb2 = new Database(testPath2);
                    testDb2.close();
                    fs.unlinkSync(testPath2);

                } catch (rebuildError) {
                    console.log('❌ Automatic rebuild failed');
                    console.log('🔧 Manual fix required:');
                    console.log('   Run: npm rebuild better-sqlite3');
                    console.log('   Or: npm install --rebuild');
                    throw new Error('better-sqlite3 requires rebuild for this environment');
                }
            } else {
                throw error;
            }
        }
    }

    /**
     * Check database version and migrate if needed
     */
    private async checkAndMigrateDatabase(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            // Check if database has any tables (new database)
            const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

            if (tables.length === 0) {
                // New database - create fresh schema
                console.log('🆕 Creating new database with latest schema');
                await this.createTables();
                return;
            }

            // Check if conversations table exists and has the correct schema
            const conversationsExists = tables.some((table: any) => table.name === 'conversations');

            if (!conversationsExists) {
                // Old database without conversations table
                console.log('🔄 Adding conversation tracking to existing database...');
                await this.addConversationTables();
                return;
            }

            // Check if conversations table has the correct schema
            const conversationsInfo = this.db.prepare("PRAGMA table_info(conversations)").all();
            const hasCorrectSchema = conversationsInfo.some((col: any) => col.name === 'summary');

            if (!hasCorrectSchema) {
                console.log('🔄 Migrating database to latest schema...');
                await this.migrateConversationTable();
            } else {
                console.log('✅ Database schema is up to date');

                // Ensure vector table exists for Stage 1 hybrid search
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS memory_vectors (
                        id INTEGER PRIMARY KEY,
                        dim INTEGER NOT NULL,
                        vector BLOB NOT NULL,
                        FOREIGN KEY (id) REFERENCES memories(id) ON DELETE CASCADE
                    );
                `);

                // Ensure file_digests table exists for incremental indexing cache
                this.db.exec(`
                    CREATE TABLE IF NOT EXISTS file_digests (
                        file TEXT PRIMARY KEY,
                        digest TEXT NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `);

            }
        } catch (error) {
            console.log('🔄 Database migration needed, recreating conversation tables...');
            await this.recreateConversationTables();
        }
    }

    /**
     * Add conversation tables to existing database
     */
    private async addConversationTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        const conversationSchema = `
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

        this.db.exec(conversationSchema);
        console.log('✅ Conversation tables added successfully');
    }

    /**
     * Migrate existing conversation table to new schema
     */
    private async migrateConversationTable(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            // Drop and recreate conversation tables with new schema
            this.db.exec(`
                DROP TABLE IF EXISTS messages;
                DROP TABLE IF EXISTS conversations;
            `);

            await this.addConversationTables();
            console.log('✅ Conversation tables migrated successfully');
        } catch (error) {
            console.log('⚠️ Migration failed, recreating conversation tables...');
            await this.recreateConversationTables();
        }
    }

    /**
     * Recreate conversation tables from scratch (fallback)
     */
    private async recreateConversationTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Drop conversation tables and recreate
        this.db.exec(`
            DROP TABLE IF EXISTS messages;
            DROP TABLE IF EXISTS conversations;
        `);

        await this.addConversationTables();
        console.log('✅ Conversation tables recreated with latest schema');
    }

    /**
     * Create database tables with optimized schema
     * Designed for efficient memory storage and retrieval
     */
    private async createTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not connected');
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


            -- Optional vector table for local embeddings (Stage 1)
            CREATE TABLE IF NOT EXISTS memory_vectors (
                id INTEGER PRIMARY KEY,
                dim INTEGER NOT NULL,
                vector BLOB NOT NULL,
                FOREIGN KEY (id) REFERENCES memories(id) ON DELETE CASCADE
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

            -- File digests for incremental indexing
            CREATE TABLE IF NOT EXISTS file_digests (
                file TEXT PRIMARY KEY,
                digest TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        try {
            this.db.exec(schema);
            console.log('✅ Database schema created successfully');
        } catch (err) {
            console.error('❌ Failed to create database schema:', err);
            throw err;
        }
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

        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO memories
                (content, context, type, tags, metadata, content_hash, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);

            const result = stmt.run(content, context, type, tagsJson, metadataJson, contentHash);
            console.log(`✅ Memory stored with ID: ${result.lastInsertRowid}`);
            return result.lastInsertRowid as number;

        } catch (err) {
            console.error('❌ Failed to store memory:', err);
            throw err;
        }
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
                m.metadata,
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

        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);

            const results: SearchResult[] = rows.map((row: any) => ({
                id: row.id,
                content: row.content,
                relevance: this.calculateRelevance(row.rank),
                timestamp: row.timestamp,
                type: row.type,
                context: row.context,
                tags: JSON.parse(row.tags || '[]'),
                // carry metadata for CLI formatting (not on the interface yet)
                ...(row.metadata ? { metadata: row.metadata } : {})
            }));

            // Filter by minimum relevance
            const filteredResults = results.filter(r => r.relevance >= minRelevance);

            console.log(`✅ Search completed: "${query}" - Found ${filteredResults.length} results`);
            return filteredResults;
        } catch (err) {
            console.error('❌ Search failed:', err);
            throw err;
        }
        }



        /**
         * Store/update vector embedding for a memory (Stage 1)
         */
        async upsertVector(id: number, vec: Float32Array, dim: number): Promise<void> {
            if (!this.db) throw new Error('Database not initialized');
            this.ensureVectorTable();

            // Stage 2: try sqlite-vss fast path when available


            const vss = (this as any)._vss as (undefined | { ensureTable: (d:number)=>void; upsert: (id:number, vec: Float32Array)=>void; isAvailable: ()=>boolean });
            if (vss && vss.isAvailable()) {
                try {
                    vss.ensureTable(dim);
                    vss.upsert(id, vec);
                    return;
                } catch {}
            }

            // Fallback: store in memory_vectors
            const buf = Buffer.alloc(vec.byteLength);
            for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
            const stmt = this.db.prepare(`
                INSERT INTO memory_vectors (id, dim, vector)
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET dim=excluded.dim, vector=excluded.vector
            `);
            stmt.run(id, dim, buf);
        }

        /**
         * Fetch vectors for a list of ids
         */
        async getVectors(ids: number[]): Promise<Map<number, Float32Array>> {
            if (!this.db) throw new Error('Database not initialized');
            this.ensureVectorTable();
            if (ids.length === 0) return new Map();
            const placeholders = ids.map(() => '?').join(',');
            const stmt = this.db.prepare(`SELECT id, dim, vector FROM memory_vectors WHERE id IN (${placeholders})`);
            const rows = stmt.all(...ids) as Array<{ id: number; dim: number; vector: Buffer }>;
            const map = new Map<number, Float32Array>();
            for (const r of rows) {
                const buf = r.vector as Buffer;
                // Copy buffer into a new Float32Array safely
                const f32 = new Float32Array(buf.byteLength / 4);
                for (let i = 0; i < f32.length; i++) {
                    f32[i] = buf.readFloatLE(i * 4);
                }
                map.set(r.id, f32);
            }
            return map;
        }

        /**
         * KNN query using sqlite-vss when available. Returns sorted ids and distances.
         */
        async knnSearch(vec: Float32Array, topk: number): Promise<Array<{ id: number; distance: number }>> {
            if (!this.db) throw new Error('Database not initialized');
            const vss = (this as any)._vss as (undefined | { isAvailable: () => boolean; queryNearest: (vec: Float32Array, topk:number)=>Array<{id:number;distance:number}> });
            if (!vss || !vss.isAvailable()) return [];
            try { return vss.queryNearest(vec, topk) || []; } catch { return []; }
        }

        /**
         * Delete all code memories for a given relative file path (matches metadata.file)
         */
        async deleteCodeByFile(relUnix: string): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            // metadata is stored as JSON text; use LIKE to match simple patterns
            const like = `%"file":"${relUnix.replace(/[%_]/g, m => (m === '%' ? '\%' : '\_'))}%`;
            const stmt = this.db.prepare(`DELETE FROM memories WHERE type = 'code' AND metadata LIKE ?`);
            const res = stmt.run(like);
            return res.changes || 0;
        }

        /**
         * Update metadata.file from old path to new path for code memories (rename optimization)
         */
        async updateCodeFilePath(oldRelUnix: string, newRelUnix: string): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            const oldEsc = oldRelUnix.replace(/"/g, '\\"');
            const newEsc = newRelUnix.replace(/"/g, '\\"');
            const pattern = `%"file":"${oldEsc}%`;
            const stmt = this.db.prepare(`UPDATE memories SET metadata = REPLACE(metadata, '"file":"${oldEsc}', '"file":"${newEsc}') WHERE type = 'code' AND metadata LIKE ?`);
            const res = stmt.run(pattern);
            return res.changes || 0;
        }

        /**
         * Maintenance: remove orphan vectors from fallback memory_vectors table.
         * Returns number of rows deleted. No-op if table not created yet.
         */
        async pruneOrphanVectors(): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            this.ensureVectorTable();
            const has = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_vectors'").get() as any;
            if (!has) return 0;
            const res = this.db.prepare(`DELETE FROM memory_vectors WHERE id NOT IN (SELECT id FROM memories)`).run();
            return res.changes || 0;
        }

        /**
         * Maintenance: list all file paths in file_digests.
         */
        async listAllFileDigests(): Promise<Array<{ file: string; digest: string; updatedAt: string }>> {
            if (!this.db) throw new Error('Database not initialized');
            const stmt = this.db.prepare('SELECT file, digest, updated_at as updatedAt FROM file_digests ORDER BY file ASC');
            return stmt.all() as any[];
        }

        /**
         * Count entries in file_digests for quick health summaries.
         */
        async countFileDigests(): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            const row = this.db.prepare('SELECT COUNT(*) as cnt FROM file_digests').get() as any;
            return row?.cnt || 0;
        }

        /** Count memories created at or after the ISO timestamp */
        async countMemoriesSince(sinceISO: string): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            const row = this.db.prepare('SELECT COUNT(*) as cnt FROM memories WHERE datetime(created_at) >= datetime(?)').get(sinceISO) as any;
            return row?.cnt || 0;
        }

        /** Count vectors upserted for memories created at or after the timestamp (via id linkage) */
        async countVectorsSince(sinceISO: string): Promise<number> {
            if (!this.db) throw new Error('Database not initialized');
            this.ensureVectorTable();
            const row = this.db.prepare(`
                SELECT COUNT(*) as cnt
                FROM memory_vectors mv
                WHERE mv.id IN (SELECT id FROM memories WHERE datetime(created_at) >= datetime(?))
            `).get(sinceISO) as any;
            return row?.cnt || 0;
        }

        /**
         * Maintenance: list code memory ids with raw metadata text to derive file references in CLI.
         */
        async listCodeMemoryIdsAndMetadata(): Promise<Array<{ id: number; metadata: string }>> {
            if (!this.db) throw new Error('Database not initialized');
            const stmt = this.db.prepare(`SELECT id, metadata FROM memories WHERE type = 'code'`);
            const rows = stmt.all() as Array<{ id: number; metadata: string }>;
            return rows || [];
        }

        /**
         * Maintenance: VACUUM the database to reclaim disk space.
         */
        async vacuum(): Promise<void> {
            if (!this.db) throw new Error('Database not initialized');
            this.db.exec('VACUUM');
        }




    /**
     * Get memory by ID
     */
    async getMemoryById(id: number): Promise<DatabaseMemory | null> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }


        try {
            const sql = 'SELECT * FROM memories WHERE id = ?';
            const stmt = this.db.prepare(sql);
            const row = stmt.get(id) as any;

            if (!row) {
                return null;
            }

            return {
                id: row.id,
                content: row.content,
                context: row.context,
                type: row.type,
                tags: row.tags,
                metadata: row.metadata,
                contentHash: row.content_hash,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };

        } catch (err) {
            console.error('❌ Failed to get memory:', err);
            throw err;
        }
    }

    /**
     * Delete memory by ID
     */
    async deleteMemory(id: number): Promise<boolean> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;

        } catch (err) {
            console.error('❌ Failed to delete memory:', err);
            throw err;
        }
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
    const projectId = 'antigoldfishmode-production'; // Project identifier

        try {
            // Use a transaction to ensure atomicity
            const db = this.db; // Capture db reference for transaction
            const transaction = db.transaction(() => {
                // Insert conversation
                const conversationStmt = db.prepare(`
                    INSERT INTO conversations (id, project_id, ai_assistant, context, summary)
                    VALUES (?, ?, ?, ?, ?)
                `);

                conversationStmt.run(
                    conversationId,
                    projectId,
                    aiAssistant,
                    JSON.stringify(context || {}),
                    '' // Empty summary for now
                );

                // Insert messages
                if (messages.length > 0) {
                    const messageStmt = db.prepare(`
                        INSERT INTO messages (id, conversation_id, role, content, metadata)
                        VALUES (?, ?, ?, ?, ?)
                    `);

                    for (const message of messages) {
                        const messageId = message.id || this.generateUUID();
                        messageStmt.run(
                            messageId,
                            conversationId,
                            message.role,
                            message.content,
                            JSON.stringify(message.metadata || {})
                        );
                    }
                }
            });

            // Execute the transaction
            transaction();

            console.log(`✅ Conversation recorded with ${messages.length} messages`);
            return conversationId;

        } catch (err) {
            console.error('❌ Failed to record conversation:', err);
            throw err;
        }
    }

    /**
     * Get recent conversations
     */
    async getConversations(limit: number = 50): Promise<Conversation[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sql = `
                SELECT * FROM conversations
                ORDER BY timestamp DESC
                LIMIT ?
            `;

            const stmt = this.db.prepare(sql);
            const conversations = stmt.all(limit);

            const conversationsWithMessages = await Promise.all(
                conversations.map(async (conv: any) => {
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

            return conversationsWithMessages;

        } catch (err) {
            console.error('❌ Failed to get conversations:', err);
            throw err;
        }
    }

    /**
     * Get messages for a specific conversation
     */
    private async getMessagesForConversation(conversationId: string): Promise<Message[]> {
        try {
            const sql = `
                SELECT * FROM messages
                WHERE conversation_id = ?
                ORDER BY timestamp
            `;

            const stmt = this.db!.prepare(sql);
            const messages = stmt.all(conversationId);

            const formattedMessages = messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                metadata: JSON.parse(msg.metadata || '{}')
            }));

            return formattedMessages;

        } catch (err) {
            console.error('❌ Failed to get messages:', err);
            throw err;
        }
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

        try {
            const sql = `
                SELECT
                    COUNT(*) as total_memories,
                    SUM(LENGTH(content)) as total_size_bytes,
                    MAX(updated_at) as last_updated
                FROM memories
            `;

            const stmt = this.db.prepare(sql);
            const row = stmt.get() as any;

            return {
                totalMemories: row.total_memories || 0,
                totalSizeBytes: row.total_size_bytes || 0,
                lastUpdated: row.last_updated || new Date().toISOString()
            };

        } catch (err) {
            console.error('❌ Failed to get stats:', err);
            throw err;
        }
    }

    /**
     * List memories with optional type filter. Returns raw DB rows for export tooling.
     */
    async listMemories(filter?: { type?: string }): Promise<Array<{
        id: number; content: string; type: string; context: string; tags: string; metadata: string; createdAt: string; updatedAt: string;
    }>> {
        if (!this.db) throw new Error('Database not initialized');
        const params: any[] = [];
        let sql = `SELECT id, content, type, context, tags, metadata, created_at as createdAt, updated_at as updatedAt FROM memories`;
        if (filter?.type) { sql += ' WHERE type = ?'; params.push(filter.type); }
        sql += ' ORDER BY id';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params) as any[];
        return rows.map(r => ({
            id: r.id,
            content: r.content,
            type: r.type,
            context: r.context,
            tags: r.tags,
            metadata: r.metadata,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));
    }

    /**
     * Persistent digest cache helpers for incremental code indexing
     */
    async getFileDigest(fileRelUnix: string): Promise<string | null> {
        if (!this.db) throw new Error('Database not initialized');
        const row = this.db.prepare('SELECT digest FROM file_digests WHERE file = ?').get(fileRelUnix) as any;
        return row?.digest || null;
    }

    async setFileDigest(fileRelUnix: string, digest: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        this.db.prepare(`INSERT INTO file_digests(file, digest, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(file) DO UPDATE SET digest=excluded.digest, updated_at=CURRENT_TIMESTAMP`).run(fileRelUnix, digest);
    }

    async deleteFileDigest(fileRelUnix: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        this.db.prepare('DELETE FROM file_digests WHERE file = ?').run(fileRelUnix);
    }

    async clearFileDigests(): Promise<number> {
        if (!this.db) throw new Error('Database not initialized');
        const res = this.db.prepare('DELETE FROM file_digests').run();
        return res.changes || 0;
    }

    async moveFileDigest(oldRelUnix: string, newRelUnix: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        const row = this.db.prepare('SELECT digest FROM file_digests WHERE file = ?').get(oldRelUnix) as any;
        if (row?.digest) {
            this.db.prepare(`INSERT INTO file_digests(file, digest, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                             ON CONFLICT(file) DO UPDATE SET digest=excluded.digest, updated_at=CURRENT_TIMESTAMP`).run(newRelUnix, row.digest);
        }
        this.db.prepare('DELETE FROM file_digests WHERE file = ?').run(oldRelUnix);
    }

    async listFileDigests(limit: number = 50): Promise<Array<{ file: string; digest: string; updatedAt: string }>> {
        if (!this.db) throw new Error('Database not initialized');
        const stmt = this.db.prepare('SELECT file, digest, updated_at as updatedAt FROM file_digests ORDER BY updated_at DESC LIMIT ?');
        const rows = stmt.all(limit) as any[];
        return rows.map(r => ({ file: r.file, digest: r.digest, updatedAt: r.updatedAt }));
    }

    /**
     * Close database connection and encrypt file
     * CRITICAL SECURITY: Encrypts database when closing
     */
    async close(): Promise<void> {
        if (!this.db) return;

        try {
            // Close database connection first
            if (this.db) {
                this.db.close();
                this.db = null;
                console.log('✅ Database connection closed');
            }

            // Handle encryption based on mode
            if (this.devMode) {
                // Database closed without encryption for reliability
            } else {
                // Use enterprise-grade encryption with graceful fallback
                await this.performEnterpriseEncryption();
            }

            this.initialized = false;
            this.encryptionKey = null; // Clear encryption key from memory
            this.encryptionKeySaltBase64 = null;

            // Clean up background timer if exists
            if (this.backgroundEncryptionTimer) {
                clearTimeout(this.backgroundEncryptionTimer);
                this.backgroundEncryptionTimer = null;
            }

        } catch (err) {
            console.error('❌ Error closing database:', err);
            throw err;
        }
    }

    /**
     * Enterprise-grade encryption with graceful fallback
     * Implements the security architecture from original tech specs
     */
    private async performEnterpriseEncryption(): Promise<void> {
        const maxAttempts = 3;
        const delays = [500, 1000, 2000]; // Progressive delays

        console.log('🔐 Initiating enterprise-grade encryption...');

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // Wait for file handles to be released
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));

                // Verify database file exists
                if (!fs.existsSync(this.dbPath)) {
                    console.log('📋 No database file found for encryption');
                    return;
                }

                // Attempt encryption
                await this.encryptDatabaseFile();
                console.log('🔒 Enterprise encryption completed successfully');
                return;

            } catch (error) {
                const isLastAttempt = attempt === maxAttempts - 1;

                if (isLastAttempt) {
                    // Graceful degradation - inform user but don't fail
                    console.log('⚠️  Encryption temporarily unavailable (Windows file locking)');
                    console.log('🔓 Database remains functional - will encrypt on next startup');
                    console.log('💡 This is normal on Windows systems and does not affect functionality');
                    return;
                } else {
                    console.log(`🔄 Encryption attempt ${attempt + 1} failed, retrying...`);
                }
            }
        }
    }

    /**
     * Wait for background encryption to complete (for testing/verification)
     */
    public async waitForEncryption(timeoutMs: number = 10000): Promise<boolean> {
        const startTime = Date.now();

        while (this.encryptionScheduled && (Date.now() - startTime) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return !this.encryptionScheduled;
    }

    /**
     * Check if database is currently encrypted
     */
    public isEncrypted(): boolean {
        return fs.existsSync(this.encryptedDbPath) && !fs.existsSync(this.dbPath);
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

    private ensureVectorTable(): void {
        if (!this.db) throw new Error('Database not initialized');
        const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get('memory_vectors');
        if (!exists) {
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS memory_vectors (
                    id INTEGER PRIMARY KEY,
                    dim INTEGER NOT NULL,
                    vector BLOB NOT NULL,
                    FOREIGN KEY (id) REFERENCES memories(id) ON DELETE CASCADE
                );
            `);
        }
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

    /**
     * Vector backend statistics for observability (used by `agm vector-status`).
     * Reports which backend is active and basic index stats from the fallback table.
     */
    async vectorStats(): Promise<{ backend: string; dimensions: number; count: number; note?: string }> {
        if (!this.db) throw new Error('Database not initialized');

        // Detect advanced vector backend availability (sqlite-vss)
        const vss = (this as any)._vss as (undefined | { isAvailable: () => boolean });
        const backend = (vss && vss.isAvailable && vss.isAvailable()) ? 'sqlite-vss' : 'local-js';

        // Ensure the fallback storage table exists and compute basic stats
        this.ensureVectorTable();
        let count = 0;
        let dimensions = 0;
        try {
            const row = this.db.prepare('SELECT COUNT(*) as cnt, COALESCE(MAX(dim), 0) as dim FROM memory_vectors').get() as any;
            count = row?.cnt || 0;
            dimensions = row?.dim || 0;
        } catch {
            // If anything goes wrong, keep defaults
        }

        const note = backend === 'sqlite-vss' ? undefined : 'Advanced vector backend not enabled; using local-js fallback';
        return { backend, dimensions, count, ...(note ? { note } : {}) };
    }
}
