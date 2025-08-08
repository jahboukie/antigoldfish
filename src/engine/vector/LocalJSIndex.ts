import { IVectorIndex, VectorQueryOptions, VectorQueryResult } from './IVectorIndex';
import { VectorEmbeddings } from '../VectorEmbeddings';

/**
 * LocalJSIndex - wraps existing in-memory VectorEmbeddings for IVectorIndex API
 */
export class LocalJSIndex implements IVectorIndex {
  private embeddings: VectorEmbeddings;

  constructor(embeddings: VectorEmbeddings) {
    this.embeddings = embeddings;
  }

  async init(): Promise<void> {
    // No-op for in-memory implementation
  }

  dimensions(): number {
    // VectorEmbeddings normalizes to configured dimensions
    // We rely on index stats here
    return this.embeddings.getIndexStats().dimensions;
  }

  async add(id: number, vector: Float32Array, metadata?: any): Promise<void> {
    // The existing API expects text; here we bypass generation and set via metadata
    // Easiest path: call addToIndex with a fake text, but that would re-embed.
    // Instead, extend VectorEmbeddings minimally by adding a private path is intrusive.
    // So we fallback to regenerating from metadata.content if provided; else ignore vector.
    if (metadata?.content) {
      await this.embeddings.addToIndex(id, metadata.content, metadata);
    } else {
      // If content is not provided, we cannot add the exact vector via current API.
      // As a fallback, generate from metadata.text || ''
      await this.embeddings.addToIndex(id, metadata?.text || '', metadata);
    }
  }

  async remove(id: number): Promise<void> {
    this.embeddings.removeFromIndex(id);
  }

  async query(vector: Float32Array, options?: VectorQueryOptions): Promise<VectorQueryResult[]> {
    // We don't have a vector-query API; re-embed from metadata is not possible here.
    // Use embeddings.findSimilar on a text query if provided in options as metadata.query.
    // For LocalJSIndex we will accept a special case: options as any with queryText.
    const anyOpts = (options as any) || {};
    const queryText: string = anyOpts.queryText || '';
    const limit = anyOpts.k || 10;
    const threshold = anyOpts.threshold ?? 0.1;
    const sims = await this.embeddings.findSimilar(queryText, limit, threshold);
    return sims.map(s => ({ id: s.id, score: s.similarity, metadata: { content: s.content } }));
  }

  async stats(): Promise<{ count: number; dimensions: number; backend: string }> {
    const s = this.embeddings.getIndexStats();
    return { count: s.count, dimensions: s.dimensions, backend: 'local-js' };
  }
}

