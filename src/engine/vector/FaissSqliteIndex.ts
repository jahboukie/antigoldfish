import Database from 'better-sqlite3';
import { ConnectionPool } from '../ConnectionPool';
import { IVectorIndex, VectorQueryOptions, VectorQueryResult } from './IVectorIndex';

/**
 * FaissSqliteIndex - sqlite-vss backed index (FAISS under the hood)
 *
 * Notes:
 * - Requires sqlite-vss extension to be present and loadable.
 * - Stores vectors in a VSS virtual table and references rowids of memories_v2.
 */
export class FaissSqliteIndex implements IVectorIndex {
  private pool: ConnectionPool;
  private dims: number;
  private ready = false;
  private table = 'agm_vectors';

  constructor(pool: ConnectionPool, dims: number = 384) {
    this.pool = pool;
    this.dims = dims;
  }

  async init(): Promise<void> {
    try {
      await this.pool.execute((db: Database.Database) => {
        // Enable extension loading (no-op if not supported)
        try { db.pragma('enable_load_extension = 1'); } catch {}
        // Create VSS table if extension is already loaded; otherwise, this will throw and we fallback later
        const create = `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.table} USING vss0(embedding(${this.dims}))`;
        try { db.exec(create); this.ready = true; } catch (e) {
          // Extension likely not loaded yet — keep not-ready
          this.ready = false;
        }
      });
    } catch {
      this.ready = false;
    }
  }

  dimensions(): number {
    return this.dims;
  }

  async add(id: number, vector: Float32Array, metadata?: any): Promise<void> {
    if (!this.ready) return; // graceful no-op
    await this.pool.execute((db: Database.Database) => {
      // Upsert by rowid
      const buf = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
      const stmt = db.prepare(`INSERT OR REPLACE INTO ${this.table}(rowid, embedding) VALUES (?, ?) `);
      stmt.run(id, buf);
    });
  }

  async remove(id: number): Promise<void> {
    if (!this.ready) return;
    await this.pool.execute((db: Database.Database) => {
      db.prepare(`DELETE FROM ${this.table} WHERE rowid = ?`).run(id);
    });
  }

  async query(vector: Float32Array, options?: VectorQueryOptions): Promise<VectorQueryResult[]> {
    if (!this.ready) return [];
    const k = options?.k ?? 10;
    // threshold is applied post-query if provided
    const results = await this.pool.execute((db: Database.Database) => {
      const buf = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
      const sql = `SELECT rowid AS id, distance FROM ${this.table} ORDER BY vss0(embedding, ?) LIMIT ?`;
      const rows = db.prepare(sql).all(buf, k) as any[];
      return rows;
    });
    // sqlite-vss returns smaller distance as better; convert to score
    const out: VectorQueryResult[] = results.map(r => ({ id: r.id, score: 1 / (1 + (r.distance ?? 0)) }));
    const thr = options?.threshold;
    return typeof thr === 'number' ? out.filter(x => x.score >= thr) : out;
  }

  async stats(): Promise<{ count: number; dimensions: number; backend: string }> {
    if (!this.ready) return { count: 0, dimensions: this.dims, backend: 'faiss-sqlite-vss:not-ready' };
    const count = await this.pool.execute((db: Database.Database) => {
      try { const r = db.prepare(`SELECT COUNT(*) as c FROM ${this.table}`).get() as any; return r?.c ?? 0; } catch { return 0; }
    });
    return { count, dimensions: this.dims, backend: 'faiss-sqlite-vss' };
  }
}

