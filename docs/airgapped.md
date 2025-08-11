# Air-Gapped Export/Import (.agmctx)

AGM can export code memories to a portable `.agmctx` directory.

- Export
```powershell
agm export-context --out ./ctx.agmctx --type code
```

- Verify/import (v0 is verify-only)
```powershell
agm import-context ./ctx.agmctx
```

Files included:
- `manifest.json` — schemaVersion, type, count, createdAt
- `map.csv` — id,file,lang,line_start,line_end,symbol,type,timestamp
- `vectors.f32` — contiguous float32 rows (may be empty if vectors absent)
- `notes.jsonl` — placeholder for non-code notes (currently empty)

Backups: The live database is at `.antigoldfishmode/memory.db` (encrypted/machine-bound). For raw backups, copy this file while AGM is not running.
