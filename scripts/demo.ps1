# SecuraMem 2-minute demo (Windows PowerShell)
# Run from repo root

$ErrorActionPreference = 'Stop'

function Step($title) {
  Write-Host "`n=== $title ===" -ForegroundColor Cyan
}

Step "Install & Build"
npm ci
npm run build

Step "Status (glass box)"
node dist/cli.js status --trace --explain

Step "Prove offline (no egress)"
node dist/cli.js prove-offline --json

Step "Vector status (json + explain)"
node dist/cli.js vector-status --json --explain

Step "Remember / Recall"
node dist/cli.js remember "Hello SecuraMem" --context demo --type note
node dist/cli.js recall "Hello SecuraMem" -l 5

Step "Index code (dry-run)"
node dist/cli.js index-code --path src --max-chunk 180 --explain --trace --dry-run

Step "Index code (real)"
node dist/cli.js index-code --path src --max-chunk 180 --include "**/*.ts" "**/*.tsx" --exclude "**/dist/**" "**/*.test.ts" --explain --trace

Step "Search code (filtered)"
node dist/cli.js search-code "Tracer.create" --preview 5 --hybrid --filter-path "**/Trace.ts" --explain --trace

Step "Journal (latest entries)"
node dist/cli.js journal --show

Step "Replay last command (dry-run, glass box)"
node dist/cli.js replay --last --trace --explain

Step "Replay last 3 (summary-only)"
node dist/cli.js replay --range 3 --summary-only

Step "Show last receipt"
node dist/cli.js receipt-show --last

Step "Policy status (zero-trust snapshot)"
node dist/cli.js policy status

Step "Health snapshot"
node dist/cli.js health --since 7

Step "Export context (.smemctx)"
node dist/cli.js export-context --out ./.securamem/ctx.smemctx --type code

Step "Import context (verify)"
node dist/cli.js import-context ./.securamem/ctx.smemctx

Write-Host "`nDone." -ForegroundColor Green
