# 🧠 AntiGoldfishMode (AGM)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4?style=flat&logo=github%20sponsors)](https://github.com/sponsors/jahboukie)

Air‑gapped, zero‑trust persistent memory CLI for AI agents and developers.

AGM makes code context and decisions durable, auditable, and portable without relying on any cloud services. It’s built for regulated and offline environments where transparency and operator control are non‑negotiable.

For pricing details and the honor‑system approach, see: docs/pricing.md

## Why AGM

- Zero‑trust by default: command and file access must be explicitly allowed, with an audit trail.
- Glassbox operations: plan/mirror/explain/dry‑run on every command, receipts + journal + digests.
- Code‑aware recall: index code by files or symbols, search via FTS and hybrid vector rerank (sqlite‑vss fallback safe).
- Air‑gapped protocol: export/import portable context bundles (.agmctx) for offline transfer.

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
	- `agm search-code <query> [-k N] [--preview N] [--hybrid] [--filter-path ...]`
	- Hybrid FTS + vector rerank; sqlite‑vss when available, otherwise local cosine fallback

- Air‑Gapped Context (.agmctx)
	- `agm export-context --out ./ctx.agmctx --type code`
	- `agm import-context ./ctx.agmctx` (verify‑only v0)
	- Exports: `manifest.json`, `map.csv`, `vectors.f32`, `notes.jsonl`

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

## Roadmap highlights

- .agmctx signing (ed25519) and zipped container format
- Tree‑sitter‑based symbol chunking (per‑language)
- Prove‑offline self‑check and hardened policy templates
- Role‑based profiles and enforcement
- Context replay with point‑in‑time reconstruction

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
