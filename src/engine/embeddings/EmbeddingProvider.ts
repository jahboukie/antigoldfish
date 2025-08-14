import * as path from 'path';

export interface EmbeddingInfo {
  modelId: string;
  dimensions: number;
}

export class EmbeddingProvider {
  private static instance: EmbeddingProvider | null = null;
  private extractor: any | null = null;
  private info: EmbeddingInfo | null = null;
  private cacheDir: string;
  private modelId: string;

  private constructor(projectRoot: string, modelId?: string) {
  this.cacheDir = path.join(projectRoot, '.securamem', 'models');
  this.modelId = modelId || process.env.SMEM_EMBED_MODEL || process.env.AGM_EMBED_MODEL || 'Xenova/e5-small-v2';
  }

  static create(projectRoot: string, modelId?: string): EmbeddingProvider {
    if (!this.instance) this.instance = new EmbeddingProvider(projectRoot, modelId);
    return this.instance;
  }

  async init(): Promise<void> {
    if (this.extractor) return;
    try {
      // Set offline cache dir for transformers
      (globalThis as any).process = (globalThis as any).process || process;
      process.env.TRANSFORMERS_CACHE = this.cacheDir;

      const { pipeline } = await import('@xenova/transformers');
      this.extractor = await pipeline('feature-extraction', this.modelId, {
        // Note: transformers.js will fetch from TRANSFORMERS_CACHE; ensure models are present offline
        quantized: true,
      });
      // Rough dimension for e5-small-v2 is 384
      this.info = { modelId: this.modelId, dimensions: 384 };
    } catch (e) {
      throw new Error(`Failed to initialize embeddings. Ensure model files exist at ${this.cacheDir} for ${this.modelId}. Error: ${(e as Error).message}`);
    }
  }

  getInfo(): EmbeddingInfo {
    if (!this.info) throw new Error('EmbeddingProvider not initialized');
    return this.info;
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.extractor) await this.init();
    const output: any = await this.extractor(text, { pooling: 'mean', normalize: true });
    // output is a Tensor; to array
    const data = Array.from(output.data as Float32Array);
    return new Float32Array(data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.extractor) await this.init();
    const outs: Float32Array[] = [];
    for (const t of texts) outs.push(await this.embed(t));
    return outs;
  }
}

