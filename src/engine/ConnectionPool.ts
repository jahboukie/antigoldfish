/**
 * High-Performance Connection Pool for MemoryEngine 2.0
 * Provides persistent database connections with intelligent lifecycle management
 *
 * Features:
 * - Connection reuse and pooling
 * - Automatic cleanup and health checks
 * - Performance monitoring
 * - Graceful degradation
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface ConnectionPoolOptions {
    maxConnections: number;
    idleTimeout: number;
    healthCheckInterval: number;
    enableWAL: boolean;
}

export interface ConnectionMetrics {
    activeConnections: number;
    totalConnections: number;
    hitRate: number;
    avgConnectionTime: number;
}

export class ConnectionPool {
    private pool: Database.Database[] = [];
    private activeConnections = new Set<Database.Database>();
    private dbPath: string;
    // Optional sqlite-vss extension path for FAISS
    private vssLibPath?: string;

    /**
     * Provide optional path to sqlite-vss library. If set, pool will attempt to load it on new connections.
     */
    setVectorExtensionPath(libPath: string): void {
        this.vssLibPath = libPath;
    }

    private options: ConnectionPoolOptions;
    private metrics: ConnectionMetrics;
    private healthCheckTimer?: NodeJS.Timeout;
    private lastAccess = new Map<Database.Database, number>();

    constructor(dbPath: string, options: Partial<ConnectionPoolOptions> = {}) {
        this.dbPath = dbPath;
        this.options = {
            maxConnections: 3,
            idleTimeout: 300000, // 5 minutes
            healthCheckInterval: 60000, // 1 minute
            enableWAL: true,
            ...options
        };

        this.metrics = {
            activeConnections: 0,
            totalConnections: 0,
            hitRate: 0,
            avgConnectionTime: 0
        };

        this.startHealthCheck();
    }

    /**
     * Get a connection from the pool or create new one
     */
    async acquire(): Promise<Database.Database> {
        const start = Date.now();

        // Try to reuse existing connection
        if (this.pool.length > 0) {
            const db = this.pool.pop()!;
            this.activeConnections.add(db);
            this.lastAccess.set(db, Date.now());
            this.updateMetrics(start, true);
            return db;
        }

        // Create new connection if under limit
        if (this.activeConnections.size < this.options.maxConnections) {
            const db = await this.createConnection();
            this.activeConnections.add(db);
            this.lastAccess.set(db, Date.now());
            this.updateMetrics(start, false);
            return db;
        }

        // Wait for connection to become available
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection pool timeout'));
            }, 5000);

            const checkForConnection = () => {
                if (this.pool.length > 0) {
                    clearTimeout(timeout);
                    resolve(this.acquire());
                } else {
                    setTimeout(checkForConnection, 10);
                }
            };

            checkForConnection();
        });
    }

    /**
     * Return connection to pool
     */
    release(db: Database.Database): void {
        if (this.activeConnections.has(db)) {
            this.activeConnections.delete(db);
            this.pool.push(db);
            this.lastAccess.set(db, Date.now());
        }
    }

    /**
     * Create optimized database connection
     */
    private async createConnection(): Promise<Database.Database> {
        try {
            const db = new Database(this.dbPath);

            // Enable WAL mode for better concurrency
            if (this.options.enableWAL) {
                db.pragma('journal_mode = WAL');
            }

            // Attempt to load sqlite-vss vector extension if path provided
            if (this.vssLibPath && fs.existsSync(this.vssLibPath)) {
                try {
                    db.pragma('enable_load_extension = 1');
                    db.loadExtension(this.vssLibPath);
                    console.log(`✅ Loaded sqlite-vss extension: ${this.vssLibPath}`);
                } catch (e) {
                    console.warn('⚠️ Failed to load sqlite-vss extension:', e);
                }
            }

            // Optimize SQLite settings
            db.pragma('synchronous = NORMAL');
            db.pragma('cache_size = 10000');
            db.pragma('temp_store = MEMORY');
            db.pragma('mmap_size = 268435456'); // 256MB
            db.pragma('foreign_keys = ON');

            // Prepare commonly used statements
            this.prepareStatements(db);

            this.metrics.totalConnections++;
            console.log(`✅ Created optimized database connection #${this.metrics.totalConnections}`);

            return db;

        } catch (error) {
            console.error('❌ Failed to create database connection:', error);
            throw error;
        }
    }

    /**
     * Prepare frequently used statements for better performance
     */
    private prepareStatements(db: Database.Database): void {
        // Pre-prepare common queries to avoid compilation overhead
        const commonQueries = [
            'SELECT * FROM memories WHERE id = ?',
            'SELECT * FROM memories_fts WHERE memories_fts MATCH ? LIMIT ?',
            'INSERT INTO memories (content, context, type, content_hash) VALUES (?, ?, ?, ?)',
            'SELECT COUNT(*) as count FROM memories',
            'SELECT SUM(LENGTH(content)) as size FROM memories'
        ];

        commonQueries.forEach(query => {
            try {
                db.prepare(query);
            } catch (error) {
                // Ignore preparation errors for queries that depend on schema
            }
        });
    }

    /**
     * Health check to clean up idle connections
     */
    private startHealthCheck(): void {
        this.healthCheckTimer = setInterval(() => {
            this.cleanupIdleConnections();
            this.updateConnectionMetrics();
        }, this.options.healthCheckInterval);
    }

    /**
     * Remove connections that have been idle too long
     */
    private cleanupIdleConnections(): void {
        const now = Date.now();
        const connectionsToClose: Database.Database[] = [];

        // Check pool connections
        this.pool = this.pool.filter(db => {
            const lastAccess = this.lastAccess.get(db) || 0;
            if (now - lastAccess > this.options.idleTimeout) {
                connectionsToClose.push(db);
                return false;
            }
            return true;
        });

        // Close idle connections
        connectionsToClose.forEach(db => {
            try {
                db.close();
                this.lastAccess.delete(db);
            } catch (error) {
                console.warn('Warning: Error closing idle connection:', error);
            }
        });

        if (connectionsToClose.length > 0) {
            console.log(`🧹 Cleaned up ${connectionsToClose.length} idle connections`);
        }
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(startTime: number, wasPoolHit: boolean): void {
        const connectionTime = Date.now() - startTime;

        // Update hit rate
        const totalRequests = this.metrics.hitRate * 100 + 1;
        const hits = wasPoolHit ? this.metrics.hitRate * 100 + 1 : this.metrics.hitRate * 100;
        this.metrics.hitRate = hits / totalRequests;

        // Update average connection time
        this.metrics.avgConnectionTime =
            (this.metrics.avgConnectionTime + connectionTime) / 2;
    }

    /**
     * Update connection counts
     */
    private updateConnectionMetrics(): void {
        this.metrics.activeConnections = this.activeConnections.size;
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): ConnectionMetrics {
        this.updateConnectionMetrics();
        return { ...this.metrics };
    }

    /**
     * Execute query with automatic connection management
     */
    async execute<T>(operation: (db: Database.Database) => T): Promise<T> {
        const db = await this.acquire();
        try {
            return operation(db);
        } finally {
            this.release(db);
        }
    }

    /**
     * Execute query in transaction with automatic connection management
     */
    async transaction<T>(operation: (db: Database.Database) => T): Promise<T> {
        const db = await this.acquire();
        try {
            const txn = db.transaction(() => operation(db));
            return txn();
        } finally {
            this.release(db);
        }
    }

    /**
     * Graceful shutdown
     */
    async close(): Promise<void> {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        // Close all pool connections
        [...this.pool, ...this.activeConnections].forEach(db => {
            try {
                db.close();
            } catch (error) {
                console.warn('Warning: Error closing connection during shutdown:', error);
            }
        });

        this.pool = [];
        this.activeConnections.clear();
        this.lastAccess.clear();

        console.log('✅ Connection pool closed gracefully');
    }
}