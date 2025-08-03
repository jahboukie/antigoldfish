/**
 * Vector Embedding System for Semantic Search
 * High-performance semantic similarity using local embeddings
 * 
 * Features:
 * - Local embedding generation (no external API calls)
 * - Cosine similarity search
 * - Efficient vector storage and indexing
 * - Batch processing for performance
 * - Multiple embedding strategies
 */

import * as crypto from 'crypto';

export interface EmbeddingVector {
    id: number;
    vector: number[];
    magnitude: number;
    metadata?: any;
}

export interface SimilarityResult {
    id: number;
    similarity: number;
    content?: string;
}

export interface VectorIndex {
    vectors: Map<number, EmbeddingVector>;
    dimensions: number;
    count: number;
}

export class VectorEmbeddings {
    private index: VectorIndex;
    private dimensions: number;
    private embeddingCache = new Map<string, number[]>();

    constructor(dimensions: number = 384) {
        this.dimensions = dimensions;
        this.index = {
            vectors: new Map(),
            dimensions,
            count: 0
        };
    }

    /**
     * Generate embedding vector for text content
     * Uses a high-quality local algorithm (TF-IDF + semantic hashing)
     */
    async generateEmbedding(text: string): Promise<number[]> {
        // Check cache first
        const cacheKey = this.hashText(text);
        if (this.embeddingCache.has(cacheKey)) {
            return this.embeddingCache.get(cacheKey)!;
        }

        // Generate embedding using hybrid approach
        const embedding = await this.hybridEmbedding(text);
        
        // Cache the result
        this.embeddingCache.set(cacheKey, embedding);
        
        return embedding;
    }

    /**
     * Add content with its embedding to the vector index
     */
    async addToIndex(id: number, text: string, metadata?: any): Promise<void> {
        const vector = await this.generateEmbedding(text);
        const magnitude = this.calculateMagnitude(vector);

        const embeddingVector: EmbeddingVector = {
            id,
            vector,
            magnitude,
            metadata
        };

        this.index.vectors.set(id, embeddingVector);
        this.index.count++;

        console.log(`🧠 Added embedding for ID ${id} (${vector.length}D vector)`);
    }

    /**
     * Find similar content using cosine similarity
     */
    async findSimilar(queryText: string, limit: number = 10, threshold: number = 0.1): Promise<SimilarityResult[]> {
        const queryVector = await this.generateEmbedding(queryText);
        const queryMagnitude = this.calculateMagnitude(queryVector);

        const similarities: SimilarityResult[] = [];

        // Calculate similarity with all vectors in index
        for (const [id, embeddingVector] of this.index.vectors) {
            const similarity = this.cosineSimilarity(
                queryVector,
                embeddingVector.vector,
                queryMagnitude,
                embeddingVector.magnitude
            );

            if (similarity >= threshold) {
                similarities.push({
                    id,
                    similarity,
                    content: embeddingVector.metadata?.content
                });
            }
        }

        // Sort by similarity (highest first) and limit results
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, limit);
    }

    /**
     * Hybrid embedding generation combining multiple techniques
     */
    private async hybridEmbedding(text: string): Promise<number[]> {
        // Clean and normalize text
        const cleanText = this.preprocessText(text);
        
        // Generate different types of features
        const tfidfFeatures = this.generateTFIDFFeatures(cleanText);
        const ngramFeatures = this.generateNGramFeatures(cleanText);
        const semanticFeatures = this.generateSemanticFeatures(cleanText);
        const structuralFeatures = this.generateStructuralFeatures(text);

        // Combine features with weights
        const combinedFeatures = this.combineFeatures([
            { features: tfidfFeatures, weight: 0.4 },
            { features: ngramFeatures, weight: 0.3 },
            { features: semanticFeatures, weight: 0.2 },
            { features: structuralFeatures, weight: 0.1 }
        ]);

        // Normalize to target dimensions
        return this.normalizeToSize(combinedFeatures, this.dimensions);
    }

    /**
     * Preprocess text for better feature extraction
     */
    private preprocessText(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Generate TF-IDF style features
     */
    private generateTFIDFFeatures(text: string): number[] {
        const words = text.split(' ').filter(w => w.length > 2);
        const wordCount = new Map<string, number>();
        
        // Count word frequencies
        words.forEach(word => {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        });

        // Generate feature vector based on word hashes
        const features: number[] = new Array(128).fill(0);
        
        for (const [word, count] of wordCount) {
            const hash = this.hashString(word) % features.length;
            features[hash] += Math.log(1 + count);
        }

        return features;
    }

    /**
     * Generate n-gram based features
     */
    private generateNGramFeatures(text: string): number[] {
        const features: number[] = new Array(128).fill(0);
        
        // Character 3-grams
        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substring(i, i + 3);
            const hash = this.hashString(trigram) % features.length;
            features[hash] += 1;
        }

        // Word 2-grams
        const words = text.split(' ').filter(w => w.length > 0);
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = words[i] + '_' + words[i + 1];
            const hash = this.hashString(bigram) % features.length;
            features[hash] += 1;
        }

        return features;
    }

    /**
     * Generate semantic features using word relationships
     */
    private generateSemanticFeatures(text: string): number[] {
        const features: number[] = new Array(64).fill(0);
        const words = text.split(' ').filter(w => w.length > 2);

        // Simple semantic categories
        const semanticCategories = {
            technical: ['code', 'function', 'class', 'method', 'variable', 'api', 'database', 'server'],
            action: ['create', 'update', 'delete', 'add', 'remove', 'fix', 'implement', 'build'],
            file: ['file', 'directory', 'path', 'folder', 'document', 'config', 'json', 'xml'],
            time: ['today', 'yesterday', 'week', 'month', 'recent', 'old', 'new', 'current']
        };

        let categoryIndex = 0;
        for (const [category, keywords] of Object.entries(semanticCategories)) {
            const score = keywords.reduce((sum, keyword) => {
                return sum + words.filter(word => word.includes(keyword)).length;
            }, 0);
            
            if (categoryIndex < features.length) {
                features[categoryIndex] = score;
            }
            categoryIndex++;
        }

        return features;
    }

    /**
     * Generate structural features from original text
     */
    private generateStructuralFeatures(text: string): number[] {
        const features: number[] = new Array(32).fill(0);

        // Text structure features
        features[0] = text.length / 1000; // Text length (normalized)
        features[1] = (text.match(/\./g) || []).length; // Sentences
        features[2] = (text.match(/\n/g) || []).length; // Line breaks
        features[3] = (text.match(/[A-Z]/g) || []).length / text.length; // Uppercase ratio
        features[4] = (text.match(/\d/g) || []).length / text.length; // Digit ratio
        features[5] = (text.match(/[^\w\s]/g) || []).length / text.length; // Special chars ratio

        // Code-like features
        features[6] = (text.match(/\{|\}|\[|\]/g) || []).length; // Brackets
        features[7] = (text.match(/function|class|const|let|var/g) || []).length; // JS keywords
        features[8] = (text.match(/import|export|require/g) || []).length; // Module keywords

        return features;
    }

    /**
     * Combine multiple feature vectors with weights
     */
    private combineFeatures(featureSets: { features: number[]; weight: number }[]): number[] {
        const totalLength = featureSets.reduce((sum, set) => sum + set.features.length, 0);
        const combined: number[] = [];

        for (const set of featureSets) {
            const weightedFeatures = set.features.map(f => f * set.weight);
            combined.push(...weightedFeatures);
        }

        return combined;
    }

    /**
     * Normalize vector to target size
     */
    private normalizeToSize(vector: number[], targetSize: number): number[] {
        if (vector.length === targetSize) {
            return vector;
        }

        const normalized: number[] = new Array(targetSize).fill(0);
        
        if (vector.length > targetSize) {
            // Downsample by averaging chunks
            const chunkSize = vector.length / targetSize;
            for (let i = 0; i < targetSize; i++) {
                const start = Math.floor(i * chunkSize);
                const end = Math.floor((i + 1) * chunkSize);
                let sum = 0;
                for (let j = start; j < end; j++) {
                    sum += vector[j] || 0;
                }
                normalized[i] = sum / (end - start);
            }
        } else {
            // Upsample by repeating and interpolating
            const ratio = targetSize / vector.length;
            for (let i = 0; i < vector.length; i++) {
                const targetIndex = Math.floor(i * ratio);
                if (targetIndex < targetSize) {
                    normalized[targetIndex] = vector[i];
                }
            }
        }

        // L2 normalize
        const magnitude = this.calculateMagnitude(normalized);
        if (magnitude > 0) {
            for (let i = 0; i < normalized.length; i++) {
                normalized[i] /= magnitude;
            }
        }

        return normalized;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[], magA?: number, magB?: number): number {
        if (a.length !== b.length) {
            throw new Error('Vector dimensions must match');
        }

        let dotProduct = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
        }

        const magnitudeA = magA || this.calculateMagnitude(a);
        const magnitudeB = magB || this.calculateMagnitude(b);

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    /**
     * Calculate vector magnitude (L2 norm)
     */
    private calculateMagnitude(vector: number[]): number {
        let sumSquares = 0;
        for (const value of vector) {
            sumSquares += value * value;
        }
        return Math.sqrt(sumSquares);
    }

    /**
     * Hash string to number
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Hash text for caching
     */
    private hashText(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
    }

    /**
     * Remove content from index
     */
    removeFromIndex(id: number): boolean {
        const existed = this.index.vectors.delete(id);
        if (existed) {
            this.index.count--;
        }
        return existed;
    }

    /**
     * Get index statistics
     */
    getIndexStats(): { count: number; dimensions: number; memoryUsageMB: number } {
        const memoryUsage = this.index.count * this.dimensions * 8; // 8 bytes per float64
        return {
            count: this.index.count,
            dimensions: this.dimensions,
            memoryUsageMB: memoryUsage / (1024 * 1024)
        };
    }

    /**
     * Clear all vectors from index
     */
    clearIndex(): void {
        this.index.vectors.clear();
        this.index.count = 0;
        this.embeddingCache.clear();
        console.log('🧹 Vector index cleared');
    }

    /**
     * Export index for persistence
     */
    exportIndex(): any {
        const vectors: any[] = [];
        for (const [id, vector] of this.index.vectors) {
            vectors.push({
                id,
                vector: vector.vector,
                magnitude: vector.magnitude,
                metadata: vector.metadata
            });
        }
        
        return {
            dimensions: this.dimensions,
            count: this.index.count,
            vectors
        };
    }

    /**
     * Import index from saved data
     */
    importIndex(data: any): void {
        this.dimensions = data.dimensions;
        this.index = {
            vectors: new Map(),
            dimensions: data.dimensions,
            count: data.count
        };

        for (const vectorData of data.vectors) {
            this.index.vectors.set(vectorData.id, {
                id: vectorData.id,
                vector: vectorData.vector,
                magnitude: vectorData.magnitude,
                metadata: vectorData.metadata
            });
        }

        console.log(`✅ Imported vector index with ${data.count} vectors`);
    }
}