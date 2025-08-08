/**
 * Enhanced Memory Database v2.0
 * High-performance database with vector storage, optimized schema, and intelligent indexing
 * 
 * Features:
 * - Vector embedding storage
 * - Optimized SQLite schema with better indexing
 * - Batch operations for performance
 * - Connection pooling integration
 * - Advanced query optimization
 * - Real-time statistics and monitoring
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConnectionPool } from '../engine/ConnectionPool';
import { VectorEmbeddings } from '../engine/VectorEmbeddings';
import { IVectorIndex } from '../engine/vector/IVectorIndex';

export interface EnhancedMemory {
    id: number;
    content: string;
    contentHash: string;
    context: string;
    type: string;
    tags: string[];
    metadata: any;
    embedding?: number[];
    topics?: string[];
    sentiment?: number;
    importance?: number;
    accessCount?: number;
    lastAccessed?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface EnhancedSearchOptions {
    limit?: number;
    offset?: number;
    type?: string;
    context?: string;
    tags?: string[];
    dateRange?: { start: Date; end: Date };
    minImportance?: number;
    includeEmbeddings?: boolean;
    sortBy?: 'relevance' | 'date' | 'importance' | 'access_count';
    sortOrder?: 'asc' | 'desc';
}

export interface BatchOperation {
    type: 'insert' | 'update' | 'delete';
    data: any;
}

export interface DatabaseMetrics {
    totalMemories: number;
    totalSizeBytes: number;
    averageContentLength: number;
    topContexts: Array<{ context: string; count: number }>;
    topTypes: Array<{ type: string; count: number }>;
    memoryGrowthRate: number;
    queryPerformance: {
        avgQueryTime: number;
        slowQueries: number;
        cacheHitRate: number;
    };
    indexEfficiency: {
        ftsIndexSize: number;
        vectorIndexSize: number;
        unusedIndices: string[];
    };
}

export class EnhancedMemoryDatabase {
    private connectionPool: ConnectionPool;
    private vectorEmbeddings: VectorEmbeddings;
    private vectorIndex?: IVectorIndex; // optional backend index (FAISS/LocalJS)
    private dbPath: string;
    private devMode: boolean;
    private queryCache = new Map<string, { result: any; timestamp: number }>();
    private queryStats = new Map<string, { count: number; totalTime: number }>();

    constructor(dbPath: string, connectionPool: ConnectionPool, vectorEmbeddings: VectorEmbeddings, devMode: boolean = false, vectorIndex?: IVectorIndex) {
        this.dbPath = dbPath;
        this.connectionPool = connectionPool;
        this.vectorEmbeddings = vectorEmbeddings;
        this.devMode = devMode;
        this.vectorIndex = vectorIndex;
    }

    /**
     * Initialize enhanced database with optimized schema
     */
    async initialize(): Promise<void> {
        await this.connectionPool.execute(async (db) => {
            await this.createEnhancedSchema(db);
            await this.createOptimizedIndices(db);
            await this.migrateLegacyData(db);
        });

        console.log('✅ Enhanced Memory Database initialized');
    }

    /**
     * Create optimized database schema
     */
    private async createEnhancedSchema(db: Database.Database): Promise<void> {
        const schema = `
            -- Enhanced memories table with better data types and constraints
            CREATE TABLE IF NOT EXISTS memories_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL CHECK(length(content) > 0),
                content_hash TEXT NOT NULL UNIQUE,
                context TEXT NOT NULL DEFAULT 'general',
                type TEXT NOT NULL DEFAULT 'general',
                tags TEXT DEFAULT '[]' CHECK(json_valid(tags)),
                metadata TEXT DEFAULT '{}' CHECK(json_valid(metadata)),
                topics TEXT DEFAULT '[]' CHECK(json_valid(topics)),
                
                -- Performance and intelligence fields
                embedding BLOB,           -- Vector embedding as binary
                sentiment REAL,           -- Sentiment score (-1 to 1)
                importance INTEGER DEFAULT 1 CHECK(importance BETWEEN 1 AND 10),
                access_count INTEGER DEFAULT 0,
                last_accessed DATETIME,
                
                -- Timestamps as integers for better performance
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                
                -- Size tracking
                content_length INTEGER GENERATED ALWAYS AS (length(content)) STORED
            );

            -- Enhanced FTS table with content and metadata
            CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts_v2 USING fts5(
                content,
                context,
                type,
                tags,
                topics,
                content='memories_v2',
                content_rowid='id',
                tokenize='porter'
            );

            -- Conversation tracking with better performance
            CREATE TABLE IF NOT EXISTS conversations_v2 (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                ai_assistant TEXT NOT NULL,
                summary TEXT,
                context TEXT DEFAULT '{}' CHECK(json_valid(context)),
                message_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS messages_v2 (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                metadata TEXT DEFAULT '{}' CHECK(json_valid(metadata)),
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (conversation_id) REFERENCES conversations_v2 (id) ON DELETE CASCADE
            );

            -- Performance monitoring table
            CREATE TABLE IF NOT EXISTS query_performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_type TEXT NOT NULL,
                query_params TEXT,
                execution_time_ms INTEGER,
                result_count INTEGER,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            -- Database metadata and configuration
            CREATE TABLE IF NOT EXISTS db_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            );

            -- Triggers for maintaining FTS index
            CREATE TRIGGER IF NOT EXISTS memories_fts_v2_insert AFTER INSERT ON memories_v2
            BEGIN
                INSERT INTO memories_fts_v2(rowid, content, context, type, tags, topics)
                VALUES (new.id, new.content, new.context, new.type, new.tags, new.topics);
            END;

            CREATE TRIGGER IF NOT EXISTS memories_fts_v2_delete AFTER DELETE ON memories_v2
            BEGIN
                DELETE FROM memories_fts_v2 WHERE rowid = old.id;
            END;

            CREATE TRIGGER IF NOT EXISTS memories_fts_v2_update AFTER UPDATE ON memories_v2
            BEGIN
                DELETE FROM memories_fts_v2 WHERE rowid = old.id;
                INSERT INTO memories_fts_v2(rowid, content, context, type, tags, topics)
                VALUES (new.id, new.content, new.context, new.type, new.tags, new.topics);
            END;

            -- Trigger to update access tracking
            CREATE TRIGGER IF NOT EXISTS update_access_tracking AFTER UPDATE OF access_count ON memories_v2
            BEGIN
                UPDATE memories_v2 SET last_accessed = strftime('%s', 'now') WHERE id = new.id;
            END;

            -- Trigger to update conversation message count
            CREATE TRIGGER IF NOT EXISTS update_message_count AFTER INSERT ON messages_v2
            BEGIN
                UPDATE conversations_v2 
                SET message_count = message_count + 1,
                    updated_at = strftime('%s', 'now')
                WHERE id = new.conversation_id;
            END;
        `;

        db.exec(schema);
        console.log('✅ Enhanced database schema created');
    }

    /**
     * Create optimized indices for performance
     */
    private async createOptimizedIndices(db: Database.Database): Promise<void> {
        const indices = `
            -- Primary search indices
            CREATE INDEX IF NOT EXISTS idx_memories_v2_content_hash ON memories_v2(content_hash);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_context_type ON memories_v2(context, type);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_created_at ON memories_v2(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_importance ON memories_v2(importance DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_access_count ON memories_v2(access_count DESC);
            
            -- Composite indices for common queries
            CREATE INDEX IF NOT EXISTS idx_memories_v2_type_created ON memories_v2(type, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_context_created ON memories_v2(context, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_memories_v2_importance_created ON memories_v2(importance DESC, created_at DESC);
            
            -- JSON indices for better metadata queries
            CREATE INDEX IF NOT EXISTS idx_memories_v2_tags ON memories_v2(json_extract(tags, '$'));
            CREATE INDEX IF NOT EXISTS idx_memories_v2_topics ON memories_v2(json_extract(topics, '$'));
            
            -- Conversation indices
            CREATE INDEX IF NOT EXISTS idx_conversations_v2_project ON conversations_v2(project_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_conversations_v2_assistant ON conversations_v2(ai_assistant, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_v2_conversation ON messages_v2(conversation_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_messages_v2_role ON messages_v2(role, created_at DESC);
            
            -- Performance monitoring indices
            CREATE INDEX IF NOT EXISTS idx_query_performance_type ON query_performance(query_type, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_query_performance_time ON query_performance(execution_time_ms DESC);
        `;

        db.exec(indices);
        console.log('✅ Optimized indices created');
    }

    /**
     * Migrate legacy data from old schema
     */
    private async migrateLegacyData(db: Database.Database): Promise<void> {
        try {
            // Check if legacy table exists
            const legacyExists = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='memories'
            `).get();

            if (!legacyExists) {
                console.log('✅ No legacy data to migrate');
                return;
            }

            // Migrate data from old memories table
            const legacyData = db.prepare('SELECT * FROM memories').all();
            
            if (legacyData.length > 0) {
                console.log(`🔄 Migrating ${legacyData.length} legacy memories...`);
                
                const insertStmt = db.prepare(`
                    INSERT OR IGNORE INTO memories_v2 
                    (content, content_hash, context, type, tags, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const transaction = db.transaction((memories: any[]) => {
                    for (const memory of memories) {
                        const createdAt = new Date(memory.created_at).getTime() / 1000;
                        const updatedAt = new Date(memory.updated_at || memory.created_at).getTime() / 1000;
                        
                        insertStmt.run(
                            memory.content,
                            memory.content_hash,
                            memory.context || 'general',
                            memory.type || 'general',
                            memory.tags || '[]',
                            memory.metadata || '{}',
                            createdAt,
                            updatedAt
                        );
                    }
                });

                transaction(legacyData);
                console.log('✅ Legacy data migration completed');
            }

        } catch (error) {
            console.warn('⚠️ Legacy data migration failed:', error);
        }
    }

    /**
     * Store memory with enhanced features
     */
    async storeMemory(
        content: string,
        context: string = 'general',
        type: string = 'general',
        tags: string[] = [],
        metadata: any = {},
        options: { generateEmbedding?: boolean; calculateSentiment?: boolean } = {}
    ): Promise<number> {
        
        const startTime = Date.now();
        const contentHash = this.createContentHash(content);
        
        // Generate embedding if requested
        let embedding: number[] | undefined;
        if (options.generateEmbedding !== false) {
            embedding = await this.vectorEmbeddings.generateEmbedding(content);
        }

        // Calculate sentiment if requested
        let sentiment: number | undefined;
        if (options.calculateSentiment) {
            sentiment = this.calculateSentiment(content);
        }

        // Extract topics
        const topics = this.extractTopics(content);
        
        const result = await this.connectionPool.execute((db) => {
            const stmt = db.prepare(`
                INSERT INTO memories_v2 
                (content, content_hash, context, type, tags, metadata, embedding, sentiment, topics, importance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            return stmt.run(
                content,
                contentHash,
                context,
                type,
                JSON.stringify(tags),
                JSON.stringify(metadata),
                embedding ? Buffer.from(new Float64Array(embedding).buffer) : null,
                sentiment,
                JSON.stringify(topics),
                this.calculateImportance(content, context, type)
            );
        });

        const memoryId = result.lastInsertRowid as number;

        // Add to vector index if embedding was generated
        if (embedding) {
            try {
                if (this.vectorIndex) {
                    const vec = new Float32Array(embedding);
                    await this.vectorIndex.add(memoryId, vec, { context, type, tags, content });
                } else {
                    await this.vectorEmbeddings.addToIndex(memoryId, content, { context, type, tags });
                }
            } catch (e) {
                // Non-fatal: continue even if vector backend not ready
                if (this.devMode) console.warn('Vector index add failed:', e);
            }
        }

        // Record performance
        this.recordQueryPerformance('store_memory', { context, type }, Date.now() - startTime, 1);

        console.log(`✅ Enhanced memory stored: ID ${memoryId} with ${embedding ? 'embedding' : 'no embedding'}`);
        return memoryId;
    }

    /**
     * Enhanced search with multiple strategies
     */
    async searchMemories(query: string, options: EnhancedSearchOptions = {}): Promise<EnhancedMemory[]> {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey('search', query, options);

        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            this.recordQueryPerformance('search_memory_cached', options, Date.now() - startTime, cached.length);
            return cached;
        }

        const results = await this.connectionPool.execute((db) => {
            let sql = `
                SELECT m.*, 
                       CASE WHEN fts.rank IS NOT NULL THEN fts.rank ELSE 0 END as fts_rank
                FROM memories_v2 m
                LEFT JOIN memories_fts_v2 fts ON m.id = fts.rowid AND memories_fts_v2 MATCH ?
                WHERE 1=1
            `;

            const params: any[] = [this.sanitizeFTSQuery(query)];

            // Add filters
            if (options.type) {
                sql += ' AND m.type = ?';
                params.push(options.type);
            }

            if (options.context) {
                sql += ' AND m.context = ?';
                params.push(options.context);
            }

            if (options.tags && options.tags.length > 0) {
                const tagConditions = options.tags.map(() => 'json_extract(m.tags, "$") LIKE ?').join(' OR ');
                sql += ` AND (${tagConditions})`;
                options.tags.forEach(tag => params.push(`%"${tag}"%`));
            }

            if (options.dateRange) {
                sql += ' AND m.created_at BETWEEN ? AND ?';
                params.push(
                    Math.floor(options.dateRange.start.getTime() / 1000),
                    Math.floor(options.dateRange.end.getTime() / 1000)
                );
            }

            if (options.minImportance) {
                sql += ' AND m.importance >= ?';
                params.push(options.minImportance);
            }

            // Sorting
            const sortBy = options.sortBy || 'relevance';
            switch (sortBy) {
                case 'date':
                    sql += ' ORDER BY m.created_at DESC';
                    break;
                case 'importance':
                    sql += ' ORDER BY m.importance DESC, m.created_at DESC';
                    break;
                case 'access_count':
                    sql += ' ORDER BY m.access_count DESC, m.created_at DESC';
                    break;
                default: // relevance
                    sql += ' ORDER BY (CASE WHEN fts.rank IS NOT NULL THEN ABS(fts.rank) ELSE 0 END) DESC, m.importance DESC';
            }

            sql += ' LIMIT ? OFFSET ?';
            params.push(options.limit || 10, options.offset || 0);

            const stmt = db.prepare(sql);
            const rows = stmt.all(...params);

            return rows.map(row => this.rowToEnhancedMemory(row, options.includeEmbeddings));
        });

        // Update access count for returned results
        if (results.length > 0) {
            await this.updateAccessCounts(results.map(r => r.id));
        }

        // Cache results
        this.cacheResult(cacheKey, results);

        // Record performance
        this.recordQueryPerformance('search_memory', options, Date.now() - startTime, results.length);

        return results;
    }

    /**
     * Batch operations for better performance
     */
    async executeBatch(operations: BatchOperation[]): Promise<void> {
        const startTime = Date.now();

        // Collect IDs to remove from vector index outside of the DB transaction
        const idsToRemove: number[] = [];

        await this.connectionPool.transaction((db) => {
            const insertStmt = db.prepare(`
                INSERT INTO memories_v2
                (content, content_hash, context, type, tags, metadata, embedding, sentiment, topics, importance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const updateStmt = db.prepare(`
                UPDATE memories_v2
                SET content = ?, context = ?, type = ?, tags = ?, metadata = ?, updated_at = strftime('%s', 'now')
                WHERE id = ?
            `);

            const deleteStmt = db.prepare('DELETE FROM memories_v2 WHERE id = ?');

            for (const operation of operations) {
                switch (operation.type) {
                    case 'insert':
                        const data = operation.data;
                        insertStmt.run(
                            data.content,
                            this.createContentHash(data.content),
                            data.context || 'general',
                            data.type || 'general',
                            JSON.stringify(data.tags || []),
                            JSON.stringify(data.metadata || {}),
                            data.embedding ? Buffer.from(new Float64Array(data.embedding).buffer) : null,
                            data.sentiment || null,
                            JSON.stringify(data.topics || []),
                            data.importance || 1
                        );
                        break;

                    case 'update':
                        updateStmt.run(
                            operation.data.content,
                            operation.data.context,
                            operation.data.type,
                            JSON.stringify(operation.data.tags),
                            JSON.stringify(operation.data.metadata),
                            operation.data.id
                        );
                        break;

                    case 'delete':
                        deleteStmt.run(operation.data.id);
                        idsToRemove.push(operation.data.id);
                        break;
                }
            }
        });

        // Process vector index removals outside of the transaction
        if (idsToRemove.length > 0) {
            for (const id of idsToRemove) {
                try {
                    if (this.vectorIndex) {
                        await this.vectorIndex.remove(id);
                    } else {
                        this.vectorEmbeddings.removeFromIndex(id);
                    }
                } catch {}
            }
        }

        this.recordQueryPerformance('batch_operation', { count: operations.length }, Date.now() - startTime, operations.length);
        console.log(`✅ Executed batch of ${operations.length} operations`);
    }

    /**
     * Get comprehensive database metrics
     */
    async getMetrics(): Promise<DatabaseMetrics> {
        return await this.connectionPool.execute((db) => {
            // Basic stats
            const basicStats = db.prepare(`
                SELECT 
                    COUNT(*) as total_memories,
                    SUM(content_length) as total_size_bytes,
                    AVG(content_length) as avg_content_length
                FROM memories_v2
            `).get() as any;

            // Top contexts
            const topContexts = db.prepare(`
                SELECT context, COUNT(*) as count
                FROM memories_v2
                GROUP BY context
                ORDER BY count DESC
                LIMIT 10
            `).all() as any[];

            // Top types
            const topTypes = db.prepare(`
                SELECT type, COUNT(*) as count
                FROM memories_v2
                GROUP BY type
                ORDER BY count DESC
                LIMIT 10
            `).all() as any[];

            // Query performance
            const queryPerf = db.prepare(`
                SELECT 
                    AVG(execution_time_ms) as avg_query_time,
                    COUNT(CASE WHEN execution_time_ms > 1000 THEN 1 END) as slow_queries
                FROM query_performance
                WHERE created_at > strftime('%s', 'now', '-1 hour')
            `).get() as any;

            // Growth rate (memories per day over last week)
            const growthRate = db.prepare(`
                SELECT COUNT(*) / 7.0 as daily_rate
                FROM memories_v2
                WHERE created_at > strftime('%s', 'now', '-7 days')
            `).get() as any;

            return {
                totalMemories: basicStats.total_memories || 0,
                totalSizeBytes: basicStats.total_size_bytes || 0,
                averageContentLength: basicStats.avg_content_length || 0,
                topContexts: topContexts || [],
                topTypes: topTypes || [],
                memoryGrowthRate: growthRate.daily_rate || 0,
                queryPerformance: {
                    avgQueryTime: queryPerf.avg_query_time || 0,
                    slowQueries: queryPerf.slow_queries || 0,
                    cacheHitRate: this.calculateCacheHitRate()
                },
                indexEfficiency: {
                    ftsIndexSize: 0, // TODO: Calculate FTS index size
                    vectorIndexSize: this.vectorEmbeddings.getIndexStats().memoryUsageMB,
                    unusedIndices: [] // TODO: Analyze index usage
                }
            };
        });
    }

    /**
     * Helper methods
     */
    private createContentHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    private sanitizeFTSQuery(query: string): string {
        return query.replace(/[^a-zA-Z0-9\s\-_]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    private calculateSentiment(content: string): number {
        // Simple sentiment analysis based on keywords
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'awesome', 'love', 'like', 'best', 'perfect'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'broken'];
        
        const words = content.toLowerCase().split(/\s+/);
        let score = 0;
        
        words.forEach(word => {
            if (positiveWords.includes(word)) score += 1;
            if (negativeWords.includes(word)) score -= 1;
        });
        
        return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)));
    }

    private extractTopics(content: string): string[] {
        const topicPatterns = [
            { pattern: /\b(function|method|class|variable|code)\b/gi, topic: 'programming' },
            { pattern: /\b(database|sql|query|table)\b/gi, topic: 'database' },
            { pattern: /\b(api|endpoint|request|response)\b/gi, topic: 'api' },
            { pattern: /\b(bug|error|fix|debug)\b/gi, topic: 'debugging' },
            { pattern: /\b(test|testing|unit|integration)\b/gi, topic: 'testing' },
            { pattern: /\b(deploy|deployment|production|server)\b/gi, topic: 'deployment' }
        ];

        const topics: string[] = [];
        topicPatterns.forEach(({ pattern, topic }) => {
            if (pattern.test(content)) {
                topics.push(topic);
            }
        });

        return [...new Set(topics)];
    }

    private calculateImportance(content: string, context: string, type: string): number {
        let importance = 1;
        
        // Longer content tends to be more important
        if (content.length > 500) importance += 1;
        if (content.length > 1000) importance += 1;
        
        // Certain types are more important
        if (type === 'decision' || type === 'architecture') importance += 2;
        if (type === 'bug' || type === 'error') importance += 1;
        
        // Code-related content is important
        if (/\b(function|class|method|algorithm)\b/i.test(content)) importance += 1;
        
        return Math.min(10, importance);
    }

    private rowToEnhancedMemory(row: any, includeEmbeddings: boolean = false): EnhancedMemory {
        const memory: EnhancedMemory = {
            id: row.id,
            content: row.content,
            contentHash: row.content_hash,
            context: row.context,
            type: row.type,
            tags: JSON.parse(row.tags || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            topics: JSON.parse(row.topics || '[]'),
            sentiment: row.sentiment,
            importance: row.importance,
            accessCount: row.access_count,
            lastAccessed: row.last_accessed ? new Date(row.last_accessed * 1000) : undefined,
            createdAt: new Date(row.created_at * 1000),
            updatedAt: new Date(row.updated_at * 1000)
        };

        if (includeEmbeddings && row.embedding) {
            const buffer = Buffer.from(row.embedding);
            memory.embedding = Array.from(new Float64Array(buffer.buffer));
        }

        return memory;
    }

    private async updateAccessCounts(ids: number[]): Promise<void> {
        if (ids.length === 0) return;

        await this.connectionPool.execute((db) => {
            const stmt = db.prepare('UPDATE memories_v2 SET access_count = access_count + 1 WHERE id = ?');
            const transaction = db.transaction((memoryIds: number[]) => {
                memoryIds.forEach(id => stmt.run(id));
            });
            transaction(ids);
        });
    }

    private recordQueryPerformance(queryType: string, params: any, executionTime: number, resultCount: number): void {
        // Record in stats map
        const key = queryType;
        const existing = this.queryStats.get(key) || { count: 0, totalTime: 0 };
        this.queryStats.set(key, {
            count: existing.count + 1,
            totalTime: existing.totalTime + executionTime
        });

        // Occasionally persist to database (every 10th query)
        if (existing.count % 10 === 0) {
            this.connectionPool.execute((db) => {
                const stmt = db.prepare(`
                    INSERT INTO query_performance (query_type, query_params, execution_time_ms, result_count)
                    VALUES (?, ?, ?, ?)
                `);
                stmt.run(queryType, JSON.stringify(params || {}), executionTime, resultCount);
            }).catch(error => {
                console.warn('Failed to record query performance:', error);
            });
        }
    }

    private generateCacheKey(operation: string, query: string, options: any): string {
        return `${operation}:${query}:${JSON.stringify(options)}`;
    }

    private getFromCache(key: string): any {
        const cached = this.queryCache.get(key);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute TTL
            return cached.result;
        }
        this.queryCache.delete(key);
        return null;
    }

    private cacheResult(key: string, result: any): void {
        this.queryCache.set(key, { result, timestamp: Date.now() });
        
        // Limit cache size
        if (this.queryCache.size > 100) {
            const oldestKey = this.queryCache.keys().next().value;
            if (oldestKey !== undefined) {
                this.queryCache.delete(oldestKey);
            }
        }
    }

    private calculateCacheHitRate(): number {
        const totalQueries = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.count, 0);
        const cacheHits = this.queryCache.size; // Simplified approximation
        return totalQueries > 0 ? cacheHits / totalQueries : 0;
    }

    /**
     * Cleanup and maintenance
     */
    async cleanup(): Promise<void> {
        await this.connectionPool.execute((db) => {
            // Clean old query performance data
            db.prepare(`
                DELETE FROM query_performance 
                WHERE created_at < strftime('%s', 'now', '-30 days')
            `).run();

            // Vacuum database if needed
            const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as any;
            if (dbSize.size > 50 * 1024 * 1024) { // 50MB
                db.exec('VACUUM');
                console.log('✅ Database vacuumed');
            }
        });

        // Clear old cache entries
        this.queryCache.clear();
        console.log('✅ Database cleanup completed');
    }
}