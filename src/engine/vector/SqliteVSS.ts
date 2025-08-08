import * as fs from 'fs';
import * as path from 'path';
import type Database from 'better-sqlite3';

export class SqliteVSS {
  private db: Database.Database;
  private loaded: boolean = false;
  private table: string;
  private dim: number | null = null;

  private constructor(db: Database.Database, table = 'memories_vss') {
    this.db = db;
    this.table = table;
  }

  static tryLoad(db: Database.Database, projectRoot: string, table?: string): SqliteVSS {
    const vss = new SqliteVSS(db, table);
    try {
      // Resolve platform-specific shared library path
      const platform = process.platform; // 'win32' | 'darwin' | 'linux'
      const arch = process.arch; // 'x64' | 'arm64' | ...
      const ext = platform === 'win32' ? 'dll' : platform === 'darwin' ? 'dylib' : 'so';
      const baseDir = path.join(projectRoot, '.antigoldfishmode', 'sqlite-vss', `${platform}-${arch}`);
      const candidate = path.join(baseDir, `vss0.${ext}`);
      if (fs.existsSync(candidate)) {
        // @ts-ignore better-sqlite3 loadExtension exists at runtime
        (db as any).loadExtension(candidate);
        vss.loaded = true;
      }
    } catch (e) {
      // Silently fallback; we'll use JS path
      vss.loaded = false;
    }
    return vss;
  }

  isAvailable(): boolean { return this.loaded; }

  ensureTable(dim: number): void {
    if (!this.loaded) return;
    if (this.dim === dim) return;
    try {
      // sqlite-vss: vss0 virtual table with single vector column
      this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS ${this.table} USING vss0(embedding(${dim}));`);
      this.dim = dim;
    } catch (e) {
      // If table creation fails, disable VSS for this session
      this.loaded = false;
    }
  }

  upsert(id: number, vec: Float32Array): void {
    if (!this.loaded || this.dim == null) return;
    try {
      const buf = Buffer.alloc(vec.byteLength);
      for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
      const stmt = this.db.prepare(`INSERT OR REPLACE INTO ${this.table}(rowid, embedding) VALUES (?, ?)`);
      stmt.run(id, buf);
    } catch (e) {
      // Disable on operational error
      this.loaded = false;
    }
  }

  // Vector-only nearest neighbors via sqlite-vss
  queryNearest(vec: Float32Array, topk: number): Array<{ id: number; distance: number }> {
    if (!this.loaded || this.dim == null) return [];
    const buf = Buffer.alloc(vec.byteLength);
    for (let i = 0; i < vec.length; i++) buf.writeFloatLE(vec[i], i * 4);
    const stmt = this.db.prepare(`SELECT rowid as id, distance FROM ${this.table} WHERE embedding MATCH ? ORDER BY distance LIMIT ?`);
    const rows = stmt.all(buf, topk) as Array<{ id: number; distance: number }>;
    return rows || [];
  }
}

