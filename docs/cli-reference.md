# CLI Reference

Global flags available on all commands:
- `--trace` Print plan and side-effects
- `--dry-run` Simulate without side effects
- `--json` Emit machine-readable receipts
- `--explain` Explain what and why before running

Core commands:
- `agm remember <content> [--context <c>] [--type <t>]`
- `agm recall <query> [-l, --limit <n>]`
- `agm status`
- `agm init [--force]`
- `agm vector-status` — prints Backend, Dimensions, Vectors, and an optional Note (e.g., local-js fallback)
- `agm index-code [--symbols] [--path <dir>] [--include ...] [--exclude ...] [--hybrid] [--rerank <N>]`
- `agm watch-code [--path <dir>] [--symbols] [--include ...] [--exclude ...] [--max-chunk <lines>] [--debounce <ms>]` — watches the project and incrementally indexes changed files; deletes stale entries on unlink; emits a receipt per batch. Skips unchanged files using a content digest and updates metadata paths on renames without re-embedding.
- `agm search-code <query> [-k <n>] [--preview <lines>] [--filter-path ...] [--filter-language ...] [--filter-symbol ...] [--hybrid|--semantic] [--rerank <N>]`
- `agm receipt-show [--last] [idOrPath]`
- `agm journal --show|--clear`
- `agm replay [--last|--id <id>|--range <N>] [--execute] [--summary-only]`
- `agm export-context --out <file.agmctx> --type code [--sign]` — exports manifest.json, map.csv, notes.jsonl, vectors.f32; signing is defaulted by policy (`policy.signExports=true`) or `AGM_SIGN_EXPORT=1`; with `--sign`, writes ED25519 signature and public key
- `agm import-context <dir.agmctx> [--allow-unsigned]` — verifies manifest/map/vectors, validates signature if present, and imports vectors/metadata into local DB. If `policy.requireSignedContext=true`, unsigned imports are blocked unless a trust token is granted: `agm policy trust import-context --minutes 15` then pass `--allow-unsigned`.
- `agm ai-guide`
- `agm policy status|allow-command|allow-path|doctor|trust`
- `agm prove-offline` — prints an explicit no-egress proof line (add --json for structured output)
- `agm health [--since <days>]` — quick health snapshot: DB size, total memories, vector backend/dim/count, digest cache entries, and optional deltas for the last N days

Maintenance:
- `agm digest-cache --clear` — wipe persistent digest cache
- `agm digest-cache --list [--limit <n>]` — list recent cached digests
- `agm reindex-file <file> [--symbols]` — force reindex a single file (bypass cache)
- `agm reindex-folder <folder> [--symbols] [--include ...] [--exclude ...] [--max-chunk <lines>]` — force reindex folder recursively (bypass cache)
- `agm gc [--prune-vectors] [--drop-stale-digests] [--vacuum]` — clean up orphan vectors, remove digests of missing files, optionally VACUUM to reclaim space

Examples are provided throughout the docs for Windows PowerShell.

See also:
- Receipts schema: `docs/receipts.md` for machine-readable outputs and journal format.
