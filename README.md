# 🧠 AntiGoldfishMode (AGM)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4?style=flat&logo=github%20sponsors)](https://github.com/sponsors/jahboukie)

Air‑gapped, zero‑trust persistent memory CLI for AI agents and developers.

AGM makes code context and decisions durable, auditable, and portable without relying on any cloud services. It’s built for regulated and offline environments where transparency and operator control are non‑negotiable.

For pricing details and the honor‑system approach, see: docs/pricing.md

## Why AGM

- Zero‑trust by default: command and file access must be explicitly allowed, with an audit trail.
- Glassbox operations: plan/mirror/explain/dry‑run on every command, receipts + journal + digests.
- Code‑aware recall: index code by files or symbols with Tree-sitter precision parsing, search via FTS and hybrid vector rerank (sqlite‑vss fallback safe).
 - Diff‑aware reindex: cache file digests; skip unchanged files with `--diff` (baseline cache built automatically).
- Tree-sitter AST parsing: Precise symbol boundary detection for TypeScript, JavaScript, Python with graceful fallback.
- Air‑gapped protocol: export/import portable context bundles (.agmctx) for offline transfer.
- Enterprise security suite: Cryptographic signing, audit logging, MFA support, SOC2/GDPR/HIPAA compliance ready.

## Quick start (CLI = `agm`)

```powershell
# Install globally
npm install -g antigoldfishmode

# Initialize in your project (creates .antigoldfishmode/)
agm init

# Index code (symbol-aware) and search
agm index-code --symbols --path .
agm search-code "functionName" --hybrid --preview 3 --trace

# Inspect receipts and journal
agm receipt-show --last
agm journal --show
```

Tip: If something is blocked by policy, AGM will explain and show a one‑liner fix. You can also run:

```powershell
agm policy doctor --cmd index-code --path .
agm policy allow-path ./**
```

More docs: see the `docs/` folder:
- docs/README.md (index)
- docs/getting-started.md
- docs/cli-reference.md
- docs/policy.md
- docs/vscode.md
- docs/airgapped.md
- docs/troubleshooting.md
- docs/comparison.md — AGM vs. air‑gapped alternatives
 - docs/battle-testing-guide.md — End-to-end local validation checklist
 - docs/screencast-script.md — 2–3 min demo script and shot list (Show HN ready)

## Core features

- Transparency & Operator Parity
	- Global flags: `--trace`, `--dry-run`, `--json`, `--explain`
	- Receipts: `.antigoldfishmode/receipts/*.json` with digests
	- Journal: `.antigoldfishmode/journal.jsonl`

- Zero‑Trust Policy Broker (local, auditable)
	- `agm policy status` — show effective rules
	- `agm policy allow-command <cmd>` — permit a command
	- `agm policy allow-path <glob>` — permit a path
	- `agm policy doctor [--cmd] [--path]` — explain pass/fail and print the fix
	- `agm policy trust <cmd> --minutes 15` — short‑lived dev convenience token

- Code‑aware Index & Search
	- `agm index-code [--symbols] [--path .] [--include ...] [--exclude ...]`
		- Add `--diff` to skip unchanged files after an initial baseline run.
	- `agm search-code <query> [-k N] [--preview N] [--hybrid] [--filter-path ...]`
	- Hybrid FTS + vector rerank; sqlite‑vss when available, otherwise local cosine fallback

- Air‑Gapped Context (.agmctx)
	- `agm export-context --out ./ctx.agmctx --type code [--zip] [--sign]`
	- `agm import-context ./ctx.agmctx[.zip]` (verification + receipts)
	- Exports now include: `manifest.json`, `map.csv`, `vectors.f32`, `notes.jsonl`, `checksums.json`, optional `signature.bin` + `publickey.der` (if signed)
	- Supports zipped bundle (`ctx.agmctx.zip`) with identical verification logic
	- Deterministic integrity & exit codes (see Status / Air‑gapped integrity)

## Status (v1.8.0)

Legend: ✅ shipped · ▶ partial · ⏳ planned · 💤 deferred

| Area | State | Notes |
|------|-------|-------|
| Transparency (trace, dry-run, receipts, journal, plan/mirror) | ✅ | Receipts include verification + hybrid extras |
| Zero‑trust policy broker | ✅ | allow-command/path, doctor, trust tokens |
| Code indexing (file + Tree-sitter symbols) | ✅ | AST-based precision parsing for TS/JS/Python with heuristic fallback |
| Hybrid search (FTS + vector rerank) | ✅ | ANN acceleration roadmap |
| Air‑gapped export/import | ✅ | Dir or zip, per‑file checksums, signing, provenance |
| Per‑file checksums + precedence | ✅ | Exit 4 checksum > signature mismatch |
| Signing & key rotation/archive | ✅ | key rotate/status/list/prune; archived keys stored |
| Provenance metadata | ✅ | Exporter version/node/host + keyId in manifest |
| Path redaction guard | ✅ | Removes sensitive absolute prefixes in receipts |
| Replay (basic) | ▶ | Time‑travel deferred |
| Usage-based nudges | ⏳ | usage.json scaffold not yet |
| Tree‑sitter precision | ✅ | AST-based symbol extraction for TypeScript/JavaScript/Python |
| ANN / approximate vectors | ⏳ | Next performance upgrade after Tree-sitter |
| Merge/diff import preview | ⏳ | Pro feature roadmap |
| Time-travel replay | 💤 | Post ANN + symbol precision |

Integrity Exit Codes (import-context):
| Code | Meaning |
|------|---------|
| 2 | Blocked: unsigned bundle (policy requires signature) |
| 3 | Invalid signature (cryptographic failure) |
| 4 | Checksum mismatch (file tampered/corrupt) |

Symbol Mode: Tree-sitter AST parsing provides precise language-aware symbol segmentation for TypeScript, JavaScript, and Python. Falls back to heuristic parsing when Tree-sitter is unavailable. Significantly improves recall accuracy over regex-based approaches.

ANN Acceleration: Present build uses deterministic local cosine fallback when sqlite‑vss not available. ANN / approximate recall arrives post v1.8.0; no network calls will be introduced.

Security Note: See SECURITY.md for the zero‑egress posture, signing model, and policy threat boundaries.

## Security model (local‑only by default)

- No network egress for core operations; all data lives in `.antigoldfishmode/` and is encrypted at rest by default.
- Policy‑enforced command and path access with audit log (`.antigoldfishmode/audit.log`).
- Clear remediation when blocked: AGM prints the exact `agm policy ...` fix.

## Command reference (selected)

- Project & status
	- `agm init` — initialize project
	- `agm status` — project/memory stats
	- `agm vector-status` — vector backend info

- Index & search
	- `agm index-code` — index code into memory
	- `agm search-code` — search indexed chunks

- Transparency & replay
	- `agm receipt-show [--last]` — pretty‑print a receipt
	- `agm journal --show|--clear` — view or clear journal
	- `agm replay --last|--range N [--dry-run]` — safe replays (prototype)

- Policy
	- `agm policy status|doctor|allow-command|allow-path|trust`

- Proofs
	- `agm prove-offline [--json]` — explicit no‑egress proof line for audits

- Air‑gapped
	- `agm export-context` and `agm import-context`

- Maintenance & Recovery
	- `agm db-doctor` — integrity check + automatic repair (backs up corrupted file then rebuilds schema)
	- `agm digest-cache --list|--clear` — inspect or reset file digest cache used by `--diff`

## Roadmap highlights

Shipped (v1.8.0):
- .agmctx signing (ed25519) + zipped container format + per‑file checksums + provenance
- Prove‑offline self‑check & hardened policy broker
- Tree‑sitter‑based symbol chunking (precision + diff-aware reindex)
- Enterprise security suite (cryptographic signing, audit logging, MFA, compliance)

Upcoming (short horizon):
- ANN / faster hybrid ranking
- Merge/diff import preview & delta exports
- Usage-based nudge scaffolding (privacy-preserving local usage.json)

Deferred (post performance upgrades):
- Role‑based memory profiles
- Time-travel replay (point‑in‑time reconstruction)

## Requirements



AGM gives regulated, air‑gapped teams a trustworthy memory layer: transparent, auditable, and under operator control.

## Pricing

AGM is MIT‑licensed and fully functional for everyone. We use an honor‑system for paid tiers — there are no license checks, no DRM, and no telemetry. If AGM saves you time or unlocks offline workflows, please consider sponsoring to fund maintenance. Paid benefits are delivered outside the binary (signed builds, templates, support), so the CLI remains air‑gapped.

- Core (OSS): Free — all features for local use: indexing, hybrid search, receipts/journal, export/import, prove‑offline, gc/health, watch‑code.
- Pro (Individual): $5/month or $50/year — signed prebuilt binaries, priority triage (best‑effort), early features, health/gc extras, policy template pack, email support (48–72h).
- Team: $8/user/month (min $80/mo) — everything in Pro, plus org policy templates, onboarding kit, signed releases channel, email support (24–48h), quarterly roadmap call, usage/receipt aggregation scripts.
- Enterprise: $25/user/month (min $1,000/mo or $12k/year) — everything in Team, plus security review artifacts, air‑gapped distribution playbooks, custom build signing bootstrap, priority support (business‑hours SLA), procurement docs, optional private workshop.

Honor‑system means the software works regardless of payment; you sponsor to support maintenance and receive value‑add services. No phoning home.

Links:
- Sponsor (Pro): https://github.com/sponsors/jahboukie
- Team/Enterprise contact: mailto:team.mobileweb@gmail.com

More details and FAQs: docs/pricing.md

### Why upgrade to Pro

- Faster, smarter indexing (Tree‑sitter symbols; diff‑aware reindex)
- Operational confidence (curated binaries; prebundled sqlite‑vss when available)
- Better observability (receipt rollups; HTML health reports)
- Less policy friction (policy templates; interactive doctor)
- Enhanced .agmctx (zipped, checksums, merge, verify reports)

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->
