# AntiGoldfishMode – User Guide

Quick reference for this project. All data stays local under .antigoldfishmode/.

## First steps
- agm status  # show DB path and memory totals
- agm vector-status  # backend/dimensions/count
- agm health [--since 7]  # quick snapshot + deltas

## Index & watch
- agm index-code --symbols --path .
- agm watch-code --path src --symbols --max-chunk 200  # background task available in VS Code

Policy tips (if blocked):
- agm policy allow-command watch-code
- agm policy allow-path "**/*"

## Search
- agm search-code "query" --hybrid --preview 3
- Filters: --filter-path, --filter-language, --filter-symbol

## Maintenance
- agm digest-cache --list --limit 20
- agm reindex-file <file> [--symbols]
- agm reindex-folder <folder> [--symbols] [--include ...] [--exclude ...]
- agm gc --prune-vectors --drop-stale-digests --vacuum

## Air-gapped export
- agm export-context --out ./.antigoldfishmode/ctx.agmctx --type code [--sign]
- agm import-context ./.antigoldfishmode/ctx.agmctx

## AI guide
- agm ai-guide  # prints AI operating instructions
- See also .antigoldfishmode/AI_ASSISTANT_GUIDE.md

Receipts: .antigoldfishmode/receipts/*.json
Journal: .antigoldfishmode/journal.jsonl
Policy: .antigoldfishmode/policy.json
