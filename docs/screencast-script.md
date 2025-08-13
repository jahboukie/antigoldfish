# AGM Screencast Script and Shot List (Windows PowerShell)

Purpose: record a concise, confidence‑building demo for developers (Show HN friendly). Target length: 2–3 minutes. Optional 60‑sec cut included.

Recording tips
- Terminal: Windows PowerShell, font 18–20pt, light theme for readability.
- Window size: 1280×720 (or 1920×1080 if your screen allows). Zoom text as needed.
- Tooling: OBS Studio (Display Capture) or ScreenToGif for quick captures.
- Hide secrets; AGM is local‑only but do not show unrelated files.
- Show keystrokes if available; avoid mouse jitters.

Setup (off‑camera or as a quick first shot)
```powershell
npm ci
npm run build
```
Expected: build succeeds, dist/ present.

Shot 1 — Title (3–5s)
- Narration: “AntiGoldfishMode: Air‑gapped, zero‑trust memory for developers. Local‑only, receipts, and code‑aware search.”
- Visual: Repo root, README header.

Shot 2 — Prove offline (10s)
```powershell
node dist/cli.js prove-offline --json
```
- Say: “First, explicit no‑egress proof.”
- Show JSON with policyNetworkEgress:"blocked".

Shot 3 — Status (10s)
```powershell
node dist/cli.js status
```
- Say: “Local SQLite, encrypted at rest, schema ready.”

Shot 4 — Remember + Recall (15s)
```powershell
node dist/cli.js remember "Hello AGM" --context demo --type note
node dist/cli.js recall "Hello AGM" -l 5
```
- Say: “Store and instantly recall local memories—no cloud.”

Shot 5 — Index code (20–25s)
Dry‑run first (optional 5s):
```powershell
node dist/cli.js index-code --path src --max-chunk 180 --explain --dry-run
```
Real run:
```powershell
node dist/cli.js index-code --path src --max-chunk 180 --include "**/*.ts" "**/*.tsx" --exclude "**/dist/**" "**/*.test.ts" --explain
```
- Say: “Index code into local memory. Chunks, metadata, receipts.”
- Expected: ‘Saved chunks: N’ and path to receipt.

Shot 6 — Search code (15–20s)
```powershell
node dist/cli.js search-code "Tracer.create" --preview 5 --hybrid --filter-path "**/Trace.ts" --explain
```
- Say: “FTS search with optional vector re‑rank. Filter by path; show previews.”

Shot 7 — Vector status (8–10s)
```powershell
node dist/cli.js vector-status --explain --json
```
- Say: “Vector backend summary—local‑js fallback is safe; sqlite‑vss when enabled.”

Shot 8 — Receipts (10s)
```powershell
node dist/cli.js receipt-show --last
```
- Say: “Every command writes a verifiable receipt for audits.”

Shot 9 — Health snapshot (10–15s)
```powershell
node dist/cli.js health --since 7
```
- Say: “One‑line health: memories, vectors, latency, and maintenance tips.”

Optional Shot 10 — Watch code (20s)
```powershell
node dist/cli.js policy allow-command watch-code
node dist/cli.js watch-code --path src --max-chunk 180 --debounce 400
# Edit a file in src/ and show an incremental index log; stop with Ctrl+C.
```
- Say: “Dev loop: incremental reindex on change.”

Optional Shot 11 — Export/import (30s)
```powershell
node dist/cli.js policy status
node dist/cli.js export-context --out context.agmctx --type code --explain
node dist/cli.js import-context context.agmctx
# If your policy requires signed contexts, show the trust-based bypass:
node dist/cli.js policy trust import-context --minutes 5
node dist/cli.js import-context context.agmctx --allow-unsigned
```
- Say: “Portable, air‑gapped bundles. Policy can default to signing exports and require signed imports; you can grant a short-lived trust and pass --allow-unsigned for demos.”

Closing (5–8s)
- Say: “Transparent, local‑only memory for devs. Receipts, policy, and code‑aware recall. Try it—agm init.”

Short 60‑second cut (script)
1) prove-offline (8s) — JSON proof shown.
2) remember/recall (10s) — quick round‑trip.
3) index-code (15s) — real run, show ‘Saved chunks’.
4) search-code (15s) — filtered symbol query.
5) receipt-show (7s) — highlight resultSummary.
6) health (5s) — show counts and tip.

Appendix: Recording presets
- OBS: 1280×720, 30fps, CBR 6–8 Mbps, AAC 160 kbps.
- Terminal font: Cascadia Code 20pt, line spacing 1.1.
- Enable text cursor blinking and increased contrast for readability.
