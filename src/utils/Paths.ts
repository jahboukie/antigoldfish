import * as fs from 'fs';
import * as path from 'path';

const LEGACY_DIR = '.antigoldfishmode';
const CANON_DIR = '.securamem';

function dirExists(p: string): boolean {
  try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); } catch { return false; }
}

function fileExists(p: string): boolean {
  try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch { return false; }
}

export class Paths {
  static baseDir(projectRoot: string): string {
    const canon = path.join(projectRoot, CANON_DIR);
    const legacy = path.join(projectRoot, LEGACY_DIR);
    // Prefer canonical; if neither exists, create canonical.
    if (dirExists(canon)) return canon;
    if (dirExists(legacy)) return legacy; // read fallback if canon not created yet
    fs.mkdirSync(canon, { recursive: true });
    return canon;
  }

  static ensureCanonical(projectRoot: string): string {
    const canon = path.join(projectRoot, CANON_DIR);
    if (!dirExists(canon)) fs.mkdirSync(canon, { recursive: true });
    return canon;
  }

  static receiptsDir(projectRoot: string): string {
    const base = this.baseDir(projectRoot);
    const dir = path.join(base, 'receipts');
    if (!dirExists(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  static journalPath(projectRoot: string): string {
    const base = this.baseDir(projectRoot);
    return path.join(base, 'journal.jsonl');
  }

  static policyPath(projectRoot: string): string {
    const base = this.baseDir(projectRoot);
    return path.join(base, 'policy.json');
  }

  static vectorIndexPath(projectRoot: string): { read: string[]; write: string } {
    const canon = path.join(projectRoot, CANON_DIR, 'vector_index.json');
    const legacy = path.join(projectRoot, LEGACY_DIR, 'vector_index.json');
    return { read: [canon, legacy], write: canon };
  }

  static modelsDir(projectRoot: string): string {
    const base = this.ensureCanonical(projectRoot);
    const dir = path.join(base, 'models');
    if (!dirExists(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  static locateExisting(paths: string[]): string | null {
    for (const p of paths) { if (fileExists(p) || dirExists(p)) return p; }
    return null;
  }

  /**
   * Migrate legacy directory (.antigoldfishmode) to canonical (.securamem).
   * - Creates .securamem if missing
   * - Copies files/folders recursively without overwriting existing .securamem files
   * - Writes a marker .migrated-from-antigoldfishmode file on success
   * - Safe and idempotent; returns true if a migration was performed
   */
  static migrateLegacyToCanonical(projectRoot: string): boolean {
    const legacy = path.join(projectRoot, LEGACY_DIR);
    const canon = path.join(projectRoot, CANON_DIR);
    const marker = path.join(canon, '.migrated-from-antigoldfishmode');
    if (!dirExists(legacy)) return false;
  if (fileExists(marker)) return false;
  if (!dirExists(canon)) fs.mkdirSync(canon, { recursive: true });

    const copyRecursive = (src: string, dst: string) => {
      if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const ent of entries) {
        const s = path.join(src, ent.name);
        const d = path.join(dst, ent.name);
        if (ent.isDirectory()) {
          copyRecursive(s, d);
        } else if (ent.isFile()) {
          if (!fileExists(d)) {
            try { fs.copyFileSync(s, d); } catch {}
          }
        }
      }
    };

    // Prefer a hard move (rename) to avoid divergence; then create legacy junction for compatibility
    try {
      // If canon is empty (just created), attempt to remove it so rename can succeed
      try {
        const entries = fs.readdirSync(canon);
        if (entries.length === 0) fs.rmdirSync(canon);
      } catch {}
      fs.renameSync(legacy, canon);
      // Best-effort: create a junction at legacy pointing to canon (Windows-friendly)
      try { fs.symlinkSync(canon, legacy, 'junction'); } catch {}
      try { fs.writeFileSync(marker, new Date().toISOString()); } catch {}
      return true;
    } catch {
      // Fallback to copy if rename or link fails
      try {
        if (!dirExists(canon)) fs.mkdirSync(canon, { recursive: true });
        copyRecursive(legacy, canon);
        try { fs.writeFileSync(marker, new Date().toISOString()); } catch {}
        return true;
      } catch {
        return false;
      }
    }
  }
}
