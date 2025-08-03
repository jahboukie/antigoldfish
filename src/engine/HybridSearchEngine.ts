/**
 * Hybrid Search Engine for MemoryEngine 2.0
 * Combines full-text search (FTS5) with vector semantic similarity
 * 
 * Features:
 * - Multi-strategy search (keyword + semantic)
 * - Intelligent result fusion and ranking
 * - Contextual relevance scoring
 * - Real-time performance optimization
 * - Adaptive search strategies
 */

import { SearchResult, SearchOptions } from '../database/MemoryDatabase';
import { VectorEmbeddings, SimilarityResult } from './VectorEmbeddings';
import { MemoryCache } from './MemoryCache';

export interface HybridSearchOptions extends SearchOptions {
    strategy?: 'balanced' | 'keyword-first' | 'semantic-first' | 'adaptive';
    semanticWeight?: number;
    keywordWeight?: number;
    fusionMethod?: 'rrf' | 'weighted' | 'max' | 'combined';
    enableCaching?: boolean;
    explain?: boolean; // Return search explanation
}

export interface HybridSearchResult extends SearchResult {
    keywordScore?: number;
    semanticScore?: number;
    fusionScore?: number;
    searchStrategy?: string;
    explanation?: string;
}

export interface SearchExplanation {
    strategy: string;
    keywordResults: number;
    semanticResults: number;
    cacheHit: boolean;
    searchTime: number;
    fusionMethod: string;
}

export class HybridSearchEngine {
    private vectorEmbeddings: VectorEmbeddings;
    private cache: MemoryCache<string, HybridSearchResult[]>;
    private searchStats = {
        totalSearches: 0,
        cacheHits: 0,
        avgSearchTime: 0,
        strategyUsage: new Map<string, number>()
    };

    constructor(vectorEmbeddings: VectorEmbeddings, cache: MemoryCache) {
        this.vectorEmbeddings = vectorEmbeddings;
        this.cache = cache;
    }

    /**
     * Perform hybrid search combining FTS and vector similarity
     */
    async search(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions = {}
    ): Promise<{ results: HybridSearchResult[]; explanation?: SearchExplanation }> {
        const startTime = Date.now();
        const searchId = this.generateSearchId(query, options);

        // Check cache first
        if (options.enableCaching !== false) {
            const cached = this.cache.getCachedSearchResults(query, options) as HybridSearchResult[];
            if (cached) {
                this.recordCacheHit();
                const explanation = options.explain ? {
                    strategy: 'cached',
                    keywordResults: 0,
                    semanticResults: 0,
                    cacheHit: true,
                    searchTime: Date.now() - startTime,
                    fusionMethod: 'none'
                } : undefined;

                return { results: cached, explanation };
            }
        }

        // Determine search strategy
        const strategy = this.determineStrategy(query, options);
        
        // Execute search based on strategy
        const results = await this.executeHybridSearch(query, ftsSearchFn, options, strategy);
        
        // Cache results
        if (options.enableCaching !== false) {
            this.cache.cacheSearchResults(query, results, options);
        }

        // Update statistics
        this.updateSearchStats(strategy, Date.now() - startTime);

        const explanation = options.explain ? {
            strategy,
            keywordResults: results.filter(r => r.keywordScore && r.keywordScore > 0).length,
            semanticResults: results.filter(r => r.semanticScore && r.semanticScore > 0).length,
            cacheHit: false,
            searchTime: Date.now() - startTime,
            fusionMethod: options.fusionMethod || 'rrf'
        } : undefined;

        console.log(`🔍 Hybrid search: "${query}" (${strategy}) → ${results.length} results in ${Date.now() - startTime}ms`);

        return { results, explanation };
    }

    /**
     * Execute hybrid search with specific strategy
     */
    private async executeHybridSearch(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions,
        strategy: string
    ): Promise<HybridSearchResult[]> {
        
        switch (strategy) {
            case 'keyword-first':
                return this.keywordFirstSearch(query, ftsSearchFn, options);
            
            case 'semantic-first':
                return this.semanticFirstSearch(query, ftsSearchFn, options);
            
            case 'balanced':
                return this.balancedSearch(query, ftsSearchFn, options);
            
            case 'adaptive':
                return this.adaptiveSearch(query, ftsSearchFn, options);
            
            default:
                return this.balancedSearch(query, ftsSearchFn, options);
        }
    }

    /**
     * Balanced search: Equal weight to FTS and semantic
     */
    private async balancedSearch(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions
    ): Promise<HybridSearchResult[]> {
        
        // Execute both searches in parallel
        const [keywordResults, semanticResults] = await Promise.all([
            ftsSearchFn(query, { ...options, limit: (options.limit || 10) * 2 }),
            this.vectorEmbeddings.findSimilar(query, (options.limit || 10) * 2, 0.1)
        ]);

        // Convert semantic results to SearchResult format
        const semanticSearchResults = await this.convertSimilarityResults(semanticResults);

        // Fuse results
        return this.fuseResults(
            keywordResults,
            semanticSearchResults,
            options.fusionMethod || 'rrf',
            options.keywordWeight || 0.5,
            options.semanticWeight || 0.5,
            options.limit || 10
        );
    }

    /**
     * Keyword-first search: FTS with semantic fallback
     */
    private async keywordFirstSearch(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions
    ): Promise<HybridSearchResult[]> {
        
        // Try keyword search first
        const keywordResults = await ftsSearchFn(query, options);
        
        if (keywordResults.length >= (options.limit || 10)) {
            // Enough keyword results, add semantic scores
            return this.enhanceWithSemanticScores(keywordResults, query);
        }
        
        // Need more results, add semantic search
        const remainingLimit = (options.limit || 10) - keywordResults.length;
        const semanticResults = await this.vectorEmbeddings.findSimilar(query, remainingLimit * 2, 0.1);
        const semanticSearchResults = await this.convertSimilarityResults(semanticResults);
        
        // Filter out duplicates and combine
        const combinedResults = this.combineWithoutDuplicates(keywordResults, semanticSearchResults);
        
        return combinedResults.slice(0, options.limit || 10);
    }

    /**
     * Semantic-first search: Vector similarity with keyword enhancement
     */
    private async semanticFirstSearch(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions
    ): Promise<HybridSearchResult[]> {
        
        // Start with semantic search
        const semanticResults = await this.vectorEmbeddings.findSimilar(query, (options.limit || 10) * 2, 0.05);
        const semanticSearchResults = await this.convertSimilarityResults(semanticResults);
        
        if (semanticSearchResults.length >= (options.limit || 10)) {
            // Enhance with keyword scores
            return this.enhanceWithKeywordScores(semanticSearchResults, query, ftsSearchFn);
        }
        
        // Need more results, add keyword search
        const keywordResults = await ftsSearchFn(query, {
            ...options,
            limit: (options.limit || 10) - semanticSearchResults.length
        });
        
        return this.combineWithoutDuplicates(semanticSearchResults, keywordResults);
    }

    /**
     * Adaptive search: Choose strategy based on query characteristics
     */
    private async adaptiveSearch(
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>,
        options: HybridSearchOptions
    ): Promise<HybridSearchResult[]> {
        
        const queryCharacteristics = this.analyzeQuery(query);
        
        if (queryCharacteristics.isSpecific) {
            return this.keywordFirstSearch(query, ftsSearchFn, options);
        } else if (queryCharacteristics.isConceptual) {
            return this.semanticFirstSearch(query, ftsSearchFn, options);
        } else {
            return this.balancedSearch(query, ftsSearchFn, options);
        }
    }

    /**
     * Fuse results from multiple search methods
     */
    private fuseResults(
        keywordResults: SearchResult[],
        semanticResults: SearchResult[],
        method: string,
        keywordWeight: number,
        semanticWeight: number,
        limit: number
    ): HybridSearchResult[] {
        
        const fusedResults = new Map<number, HybridSearchResult>();
        
        // Process keyword results
        keywordResults.forEach((result, index) => {
            const keywordScore = this.normalizeRankScore(index, keywordResults.length);
            fusedResults.set(result.id, {
                ...result,
                keywordScore,
                semanticScore: 0,
                fusionScore: 0,
                searchStrategy: 'hybrid'
            });
        });
        
        // Process semantic results
        semanticResults.forEach((result, index) => {
            const semanticScore = this.normalizeRankScore(index, semanticResults.length);
            
            if (fusedResults.has(result.id)) {
                // Update existing result
                const existing = fusedResults.get(result.id)!;
                existing.semanticScore = semanticScore;
            } else {
                // Add new result
                fusedResults.set(result.id, {
                    ...result,
                    keywordScore: 0,
                    semanticScore,
                    fusionScore: 0,
                    searchStrategy: 'hybrid'
                });
            }
        });
        
        // Calculate fusion scores
        for (const result of fusedResults.values()) {
            result.fusionScore = this.calculateFusionScore(
                result.keywordScore || 0,
                result.semanticScore || 0,
                keywordWeight,
                semanticWeight,
                method
            );
        }
        
        // Sort by fusion score and return top results
        const sortedResults = Array.from(fusedResults.values())
            .sort((a, b) => (b.fusionScore || 0) - (a.fusionScore || 0))
            .slice(0, limit);
        
        return sortedResults;
    }

    /**
     * Calculate fusion score using specified method
     */
    private calculateFusionScore(
        keywordScore: number,
        semanticScore: number,
        keywordWeight: number,
        semanticWeight: number,
        method: string
    ): number {
        
        switch (method) {
            case 'weighted':
                return keywordScore * keywordWeight + semanticScore * semanticWeight;
            
            case 'max':
                return Math.max(keywordScore, semanticScore);
            
            case 'combined':
                return (keywordScore + semanticScore) / 2;
            
            case 'rrf': // Reciprocal Rank Fusion
                const k = 60; // RRF constant
                const keywordRRF = keywordScore > 0 ? 1 / (k + (1 - keywordScore) * 100) : 0;
                const semanticRRF = semanticScore > 0 ? 1 / (k + (1 - semanticScore) * 100) : 0;
                return keywordRRF + semanticRRF;
            
            default:
                return keywordScore * keywordWeight + semanticScore * semanticWeight;
        }
    }

    /**
     * Normalize rank-based score (higher rank = higher score)
     */
    private normalizeRankScore(rank: number, totalResults: number): number {
        if (totalResults === 0) return 0;
        return (totalResults - rank) / totalResults;
    }

    /**
     * Convert similarity results to search result format
     */
    private async convertSimilarityResults(similarities: SimilarityResult[]): Promise<SearchResult[]> {
        return similarities.map(sim => ({
            id: sim.id,
            content: sim.content || '',
            relevance: sim.similarity,
            timestamp: new Date().toISOString(),
            type: 'semantic',
            context: 'vector',
            tags: []
        }));
    }

    /**
     * Enhance results with semantic scores
     */
    private async enhanceWithSemanticScores(
        results: SearchResult[],
        query: string
    ): Promise<HybridSearchResult[]> {
        
        const enhanced: HybridSearchResult[] = [];
        
        for (const result of results) {
            const semanticResults = await this.vectorEmbeddings.findSimilar(
                result.content,
                1,
                0.0
            );
            
            const semanticScore = semanticResults.length > 0 ? semanticResults[0].similarity : 0;
            
            enhanced.push({
                ...result,
                keywordScore: result.relevance,
                semanticScore,
                fusionScore: (result.relevance + semanticScore) / 2,
                searchStrategy: 'keyword-enhanced'
            });
        }
        
        return enhanced;
    }

    /**
     * Enhance results with keyword scores
     */
    private async enhanceWithKeywordScores(
        results: SearchResult[],
        query: string,
        ftsSearchFn: (query: string, options: SearchOptions) => Promise<SearchResult[]>
    ): Promise<HybridSearchResult[]> {
        
        // Get keyword search results for comparison
        const keywordResults = await ftsSearchFn(query, { limit: 100 });
        const keywordMap = new Map(keywordResults.map(r => [r.id, r.relevance]));
        
        return results.map(result => ({
            ...result,
            keywordScore: keywordMap.get(result.id) || 0,
            semanticScore: result.relevance,
            fusionScore: ((keywordMap.get(result.id) || 0) + result.relevance) / 2,
            searchStrategy: 'semantic-enhanced'
        }));
    }

    /**
     * Combine results without duplicates
     */
    private combineWithoutDuplicates(
        primary: SearchResult[],
        secondary: SearchResult[]
    ): HybridSearchResult[] {
        
        const seen = new Set(primary.map(r => r.id));
        const combined: HybridSearchResult[] = primary.map(r => ({
            ...r,
            keywordScore: r.relevance,
            semanticScore: 0,
            fusionScore: r.relevance,
            searchStrategy: 'combined'
        }));
        
        for (const result of secondary) {
            if (!seen.has(result.id)) {
                combined.push({
                    ...result,
                    keywordScore: 0,
                    semanticScore: result.relevance,
                    fusionScore: result.relevance,
                    searchStrategy: 'combined'
                });
                seen.add(result.id);
            }
        }
        
        return combined;
    }

    /**
     * Analyze query characteristics to determine best strategy
     */
    private analyzeQuery(query: string): { isSpecific: boolean; isConceptual: boolean } {
        const specificIndicators = [
            /\b(function|class|method|variable|file|error|bug|fix)\b/i,
            /\b\w+\.\w+/,  // Method calls or file extensions
            /\b\d+\b/,     // Numbers
            /["'`]/        // Quoted strings
        ];
        
        const conceptualIndicators = [
            /\b(how|why|what|when|where|explain|understand|concept|idea|approach)\b/i,
            /\b(pattern|design|architecture|strategy|methodology)\b/i,
            /\b(learn|tutorial|guide|example|best practice)\b/i
        ];
        
        const isSpecific = specificIndicators.some(pattern => pattern.test(query));
        const isConceptual = conceptualIndicators.some(pattern => pattern.test(query));
        
        return { isSpecific, isConceptual };
    }

    /**
     * Determine optimal search strategy
     */
    private determineStrategy(query: string, options: HybridSearchOptions): string {
        if (options.strategy) {
            return options.strategy;
        }
        
        // Auto-select based on query characteristics
        const characteristics = this.analyzeQuery(query);
        
        if (characteristics.isSpecific) {
            return 'keyword-first';
        } else if (characteristics.isConceptual) {
            return 'semantic-first';
        } else {
            return 'balanced';
        }
    }

    /**
     * Generate unique search identifier for caching
     */
    private generateSearchId(query: string, options: HybridSearchOptions): string {
        const optionsString = JSON.stringify(options);
        return `${query}:${optionsString}`;
    }

    /**
     * Record cache hit for statistics
     */
    private recordCacheHit(): void {
        this.searchStats.cacheHits++;
    }

    /**
     * Update search statistics
     */
    private updateSearchStats(strategy: string, searchTime: number): void {
        this.searchStats.totalSearches++;
        this.searchStats.avgSearchTime = 
            (this.searchStats.avgSearchTime + searchTime) / 2;
        
        const currentCount = this.searchStats.strategyUsage.get(strategy) || 0;
        this.searchStats.strategyUsage.set(strategy, currentCount + 1);
    }

    /**
     * Get search performance statistics
     */
    getSearchStats(): any {
        const cacheHitRate = this.searchStats.totalSearches > 0 
            ? this.searchStats.cacheHits / this.searchStats.totalSearches 
            : 0;
        
        return {
            ...this.searchStats,
            cacheHitRate,
            strategyUsage: Object.fromEntries(this.searchStats.strategyUsage)
        };
    }

    /**
     * Reset search statistics
     */
    resetStats(): void {
        this.searchStats = {
            totalSearches: 0,
            cacheHits: 0,
            avgSearchTime: 0,
            strategyUsage: new Map()
        };
    }
}