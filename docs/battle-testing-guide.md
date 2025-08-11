# AntiGoldfishMode (AGM) Battle‑Testing Guide

Validate AGM end‑to‑end locally with zero network egress. Commands assume Windows PowerShell in the repo root.

## Prerequisites
- Node.js 18+ (ESM/NodeNext compatible)
- npm

## 1) Build the CLI
```powershell
npm ci
npm run build
```
Expected: dist/ generated; no TypeScript errors.

## 2) Status and init
```powershell
node dist/cli.js status
# (optional)
node dist/cli.js init --force
```
Expected: “Database schema is up to date”, “Memory engine initialized”.

## 3) Prove offline (no‑egress)
```powershell
node dist/cli.js prove-offline --json
```
Expected JSON: policyNetworkEgress = "blocked"; proxies = none.

## 4) Vector readiness
```powershell
node dist/cli.js vector-status --explain --json
```
Expected: backend=local-js (unless sqlite-vss enabled), dimensions and count.

## 5) Memory smoke test
```powershell
node dist/cli.js remember "Hello AGM" --context demo --type note
node dist/cli.js recall "Hello AGM" -l 5
```
Expected: stored memory ID; recall returns with high relevance.

## 6) Index code (dry‑run → real)
Dry‑run:
```powershell
node dist/cli.js index-code --path src --max-chunk 180 --explain --dry-run
```
Real run (TS focus example):
```powershell
node dist/cli.js index-code --path src --max-chunk 180 --include "**/*.ts" "**/*.tsx" --exclude "**/dist/**" "**/*.test.ts" --explain
```
Expected: Saved chunks > 0; receipt saved under .antigoldfishmode/receipts.

## 7) Search code
```powershell
node dist/cli.js search-code "handleSearchCode" --preview 5 --hybrid --explain
```
Tips if 0 results:
- Try simpler tokens (e.g., a unique function or string)
- Narrow by path:
```powershell
node dist/cli.js search-code "Tracer.create" --preview 5 --hybrid --filter-path "**/Trace.ts"
```

## 8) Health snapshot
```powershell
node dist/cli.js health --since 7
```
Expected: non‑zero Memories/Vectors, search latency sample, GC tip.

## 9) Receipts and journal
Show last receipt:
```powershell
node dist/cli.js receipt-show --last
```
Replay last command (dry‑run by default):
```powershell
node dist/cli.js replay --last
```

## 10) Watch code (optional)
Allow and start:
```powershell
node dist/cli.js policy allow-command watch-code
node dist/cli.js watch-code --path src --max-chunk 180 --debounce 400
```
Edit a file and observe incremental indexing. Stop with Ctrl+C.

## 11) Export/import (air‑gapped)
```powershell
node dist/cli.js export-context --out context.agmctx --type code
node dist/cli.js import-context context.agmctx
```

## 12) Maintenance
```powershell
node dist/cli.js gc --prune-vectors --drop-stale-digests --vacuum
```

## Troubleshooting
- Command blocked: use policy helpers
```powershell
node dist/cli.js policy status
node dist/cli.js policy doctor --cmd watch-code --path src
node dist/cli.js policy allow-command watch-code
```
- No results: ensure indexing ran; try simpler queries; use --filter-path.
- Vector backend = local-js: expected without sqlite-vss; hybrid fallback still works.

## Verification checklist
- [ ] prove-offline returns policyNetworkEgress=blocked
- [ ] vector-status returns backend + dimensions
- [ ] remember/recall roundtrip works
- [ ] index-code saves chunks > 0
- [ ] search-code returns known tokens
- [ ] health shows non‑zero memories and vectors
- [ ] receipt-show prints latest receipt

Happy dogfooding!
