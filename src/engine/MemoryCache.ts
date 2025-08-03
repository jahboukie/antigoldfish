/**
 * High-Performance LRU Cache for MemoryEngine 2.0
 * Intelligent caching system with TTL, memory management, and performance tracking
 * 
 * Features:
 * - LRU eviction policy
 * - TTL-based expiration
 * - Memory usage tracking
 * - Cache statistics
 * - Intelligent prefetching
 */

import { SearchResult } from '../database/MemoryDatabase';

export interface CacheOptions {
    maxSize: number;
    ttl: number; // Time to live in milliseconds
    maxMemoryMB: number;
    enablePrefetch: boolean;
}

export interface CacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsageMB: number;
    evictions: number;
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    accessCount: number;
    lastAccess: number;
    memorySize: number;
}

export class MemoryCache<K = string, V = any> {
    private cache = new Map<K, CacheEntry<V>>();
    private accessOrder: K[] = [];
    private options: CacheOptions;
    private metrics: CacheMetrics;
    private cleanupTimer?: NodeJS.Timeout;

    constructor(options: Partial<CacheOptions> = {}) {
        this.options = {
            maxSize: 1000,
            ttl: 300000, // 5 minutes
            maxMemoryMB: 50,
            enablePrefetch: true,
            ...options
        };

        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            size: 0,
            memoryUsageMB: 0,
            evictions: 0
        };

        this.startCleanupTimer();
    }

    /**
     * Get value from cache
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            this.recordMiss();
            return undefined;
        }

        // Check TTL
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.recordMiss();
            return undefined;
        }

        // Update access tracking
        entry.lastAccess = Date.now();
        entry.accessCount++;
        this.moveToFront(key);
        this.recordHit();

        return entry.value;
    }

    /**
     * Set value in cache
     */
    set(key: K, value: V): void {
        const memorySize = this.estimateMemorySize(value);
        
        // Check if we need to make room
        while (this.shouldEvict(memorySize)) {
            this.evictLRU();
        }

        const entry: CacheEntry<V> = {
            value,
            timestamp: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            memorySize
        };

        // Remove existing entry if it exists
        if (this.cache.has(key)) {
            this.removeFromAccessOrder(key);
        }

        this.cache.set(key, entry);
        this.accessOrder.unshift(key);
        this.updateMetrics();

        console.log(`📦 Cached: ${String(key)} (${(memorySize / 1024).toFixed(1)}KB)`);
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: K): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            return false;
        }
        
        return true;
    }

    /**
     * Delete key from cache
     */
    delete(key: K): boolean {
        const existed = this.cache.delete(key);
        if (existed) {
            this.removeFromAccessOrder(key);
            this.updateMetrics();
        }
        return existed;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.updateMetrics();
        console.log('🧹 Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getMetrics(): CacheMetrics {
        this.updateMetrics();
        return { ...this.metrics };
    }

    /**
     * Specialized method for caching search results
     */
    cacheSearchResults(query: string, results: SearchResult[], options: any = {}): void {
        const cacheKey = this.generateSearchKey(query, options);
        this.set(cacheKey as K, results as V);
    }

    /**
     * Specialized method for retrieving cached search results
     */
    getCachedSearchResults(query: string, options: any = {}): SearchResult[] | undefined {
        const cacheKey = this.generateSearchKey(query, options);
        return this.get(cacheKey as K) as SearchResult[] | undefined;
    }

    /**
     * Prefetch related queries (predictive caching)
     */
    prefetchRelated(query: string): void {
        if (!this.options.enablePrefetch) return;

        // Generate related queries for prefetching
        const relatedQueries = this.generateRelatedQueries(query);
        
        // Note: Actual prefetching would require database access
        // This is a placeholder for the prefetch logic
        console.log(`🔮 Prefetch candidates for "${query}":`, relatedQueries.slice(0, 3));
    }

    /**
     * Generate cache key for search queries
     */
    private generateSearchKey(query: string, options: any): string {
        const optionsHash = JSON.stringify(options);
        return `search:${query}:${optionsHash}`;
    }

    /**
     * Generate related queries for prefetching
     */
    private generateRelatedQueries(query: string): string[] {
        const words = query.toLowerCase().split(/\s+/);
        const related: string[] = [];

        // Add subsets of the query
        for (let i = 1; i < words.length; i++) {
            related.push(words.slice(0, i).join(' '));
            related.push(words.slice(-i).join(' '));
        }

        // Add individual words
        words.forEach(word => {
            if (word.length > 3) {
                related.push(word);
            }
        });

        return [...new Set(related)];
    }

    /**
     * Check if entry has expired
     */
    private isExpired(entry: CacheEntry<V>): boolean {
        return Date.now() - entry.timestamp > this.options.ttl;
    }

    /**
     * Estimate memory usage of a value
     */
    private estimateMemorySize(value: V): number {
        if (typeof value === 'string') {
            return value.length * 2; // UTF-16 characters
        }
        
        if (Array.isArray(value)) {
            return value.reduce((size, item) => size + this.estimateMemorySize(item), 0);
        }
        
        if (typeof value === 'object' && value !== null) {
            const jsonString = JSON.stringify(value);
            return jsonString.length * 2;
        }
        
        return 64; // Default estimate for primitives
    }

    /**
     * Check if we should evict entries to make room
     */
    private shouldEvict(newEntrySize: number): boolean {
        const currentMemoryMB = this.getCurrentMemoryUsage() / (1024 * 1024);
        const newEntryMB = newEntrySize / (1024 * 1024);
        
        return (
            this.cache.size >= this.options.maxSize ||
            currentMemoryMB + newEntryMB > this.options.maxMemoryMB
        );
    }

    /**
     * Evict least recently used entry
     */
    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        const lruKey = this.accessOrder.pop()!;
        const removed = this.cache.delete(lruKey);
        
        if (removed) {
            this.metrics.evictions++;
            console.log(`🗑️  Evicted LRU entry: ${String(lruKey)}`);
        }
    }

    /**
     * Move key to front of access order
     */
    private moveToFront(key: K): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.unshift(key);
    }

    /**
     * Remove key from access order array
     */
    private removeFromAccessOrder(key: K): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * Calculate current memory usage
     */
    private getCurrentMemoryUsage(): number {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.memorySize;
        }
        return totalSize;
    }

    /**
     * Record cache hit
     */
    private recordHit(): void {
        this.metrics.hits++;
        this.updateHitRate();
    }

    /**
     * Record cache miss
     */
    private recordMiss(): void {
        this.metrics.misses++;
        this.updateHitRate();
    }

    /**
     * Update hit rate calculation
     */
    private updateHitRate(): void {
        const total = this.metrics.hits + this.metrics.misses;
        this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
    }

    /**
     * Update all metrics
     */
    private updateMetrics(): void {
        this.metrics.size = this.cache.size;
        this.metrics.memoryUsageMB = this.getCurrentMemoryUsage() / (1024 * 1024);
    }

    /**
     * Start periodic cleanup of expired entries
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, 60000); // Clean up every minute
    }

    /**
     * Remove expired entries
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const expiredKeys: K[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.options.ttl) {
                expiredKeys.push(key);
            }
        }

        expiredKeys.forEach(key => {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
        });

        if (expiredKeys.length > 0) {
            console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
            this.updateMetrics();
        }
    }

    /**
     * Graceful shutdown
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
        console.log('✅ Memory cache destroyed gracefully');
    }
}