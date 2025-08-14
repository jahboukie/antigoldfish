# SecuraMem CLI Reference

Global flags available on all commands:
- `--trace` Print plan and side-effects
- `--dry-run` Simulate without side effects
- `--json` Emit machine-readable receipts
- `--explain` Explain what and why before running


Core commands:
`smem remember <content> [--context <c>] [--type <t>]`
`smem recall <query> [-l, --limit <n>]`
`smem status`
`smem init [--force]`
`smem vector-status` — prints Backend, Dimensions, Vectors, and an optional Note (e.g., local-js fallback)
`smem index-code [--symbols] [--path <dir>] [--include ...] [--exclude ...] [--hybrid] [--rerank <N>]`
`smem watch-code [--path <dir>] [--symbols] [--include ...] [--exclude ...] [--max-chunk <lines>] [--debounce <ms>]` — watches the project and incrementally indexes changed files; deletes stale entries on unlink; emits a receipt per batch. Skips unchanged files using a content digest and updates metadata paths on renames without re-embedding.
`smem search-code <query> [-k <n>] [--preview <lines>] [--filter-path ...] [--filter-language ...] [--filter-symbol ...] [--hybrid|--semantic] [--rerank <N>]`
`smem receipt-show [--last] [idOrPath]`
`smem journal --show|--clear`
`smem replay [--last|--id <id>|--range <N>] [--execute] [--summary-only]`
`smem export-context --out <file.smemctx> --type code [--sign]` — exports manifest.json, map.csv, notes.jsonl, vectors.f32; signing is defaulted by policy (`policy.signExports=true`) or `SMEM_SIGN_EXPORT=1`; with `--sign`, writes ED25519 signature and public key
`smem import-context <dir.smemctx> [--allow-unsigned]` — verifies manifest/map/vectors, validates signature if present, and imports vectors/metadata into local DB. If `policy.requireSignedContext=true`, unsigned imports are blocked unless a trust token is granted: `smem policy trust import-context --minutes 15` then pass `--allow-unsigned`.
`smem ai-guide`
`smem policy status|allow-command|allow-path|doctor|trust`
`smem prove-offline` — prints an explicit no-egress proof line (add --json for structured output)
`smem health [--since <days>]` — quick health snapshot: DB size, total memories, vector backend/dim/count, digest cache entries, and optional deltas for the last N days


Maintenance:
`smem digest-cache --clear` — wipe persistent digest cache
`smem digest-cache --list [--limit <n>]` — list recent cached digests
`smem reindex-file <file> [--symbols]` — force reindex a single file (bypass cache)
`smem reindex-folder <folder> [--symbols] [--include ...] [--exclude ...] [--max-chunk <lines>]` — force reindex folder recursively (bypass cache)
`smem gc [--prune-vectors] [--drop-stale-digests] [--vacuum]` — clean up orphan vectors, remove digests of missing files, optionally VACUUM to reclaim space

Examples are provided throughout the docs for Windows PowerShell.

See also:
- Receipts schema: `docs/receipts.md` for machine-readable outputs and journal format.
