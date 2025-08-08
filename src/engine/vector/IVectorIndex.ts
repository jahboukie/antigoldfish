/**
 * IVectorIndex - abstraction over vector backends (LocalJS, FAISS/sqlite-vss, etc.)
 */

export interface VectorQueryOptions {
  k?: number;
  threshold?: number; // cosine similarity threshold (0..1)
}

export interface VectorQueryResult {
  id: number;
  score: number; // cosine similarity or backend-normalized score (higher is better)
  metadata?: any;
}

export interface IVectorIndex {
  /** Initialize index (create tables/resources). Idempotent. */
  init(): Promise<void>;

  /** Dimensions of vectors stored in this index. */
  dimensions(): number;

  /** Add or upsert a vector for an entity id. */
  add(id: number, vector: Float32Array, metadata?: any): Promise<void>;

  /** Remove an entity from the index, if present. */
  remove(id: number): Promise<void>;

  /** Query most similar items to the provided vector. */
  query(vector: Float32Array, options?: VectorQueryOptions): Promise<VectorQueryResult[]>;

  /** Basic stats for observability. */
  stats(): Promise<{ count: number; dimensions: number; backend: string }>;
}

