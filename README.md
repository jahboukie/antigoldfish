## Table of Contents

1. [Overview](#overview)
2. [Quick Features](#quick-features)
3. [Why SecuraMem?](#why-securamem)
4. [Getting Started](#getting-started)
5. [Installation](#installation)
6. [Usage Examples](#usage-examples)
7. [Policy Configuration](#policy-configuration)
8. [SBOM & Build Reproducibility](#sbom--build-reproducibility)
9. [Test Coverage & CI Status](#test-coverage--ci-status)
10. [Security & Compliance FAQ](#security--compliance-faq)
11. [Contribution Guidelines](#contribution-guidelines)
12. [License & Legal](#license--legal)
13. [Contact](#contact)

# Installation

SecuraMem is distributed as a standalone CLI. To install:

```bash
pip install smem-cli  # or use your preferred package manager
# Or download a signed binary from the releases page
```

See [USER_GUIDE.md] for platform-specific details.

# Usage Examples

```bash
# Index code and view audit log
smem index src/
smem audit --since "2025-01-01"

# Export context with signature
smem export --sign --output ctx.smemctx

# Import and verify
smem import --verify ctx.smemctx

# Policy status
smem policy status
```

# Policy Configuration

SecuraMem supports fine-grained policy controls for memory, export, and AI integration. Example:

```bash
smem policy set allow-export true
smem policy set ai-integration off
smem policy print
```

See [POLICY_GUIDE.md] for full details.

# SBOM & Build Reproducibility

Generate a Software Bill of Materials (SBOM) and verify builds:

```bash
smem sbom generate
smem build verify --sbom sbom.json
```

# Test Coverage & CI Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

# Security & Compliance FAQ

**Q: Is SecuraMem truly air-gapped?**
A: Yes. All operations are local-only, with zero network egress by default.

**Q: Can I prove compliance for audits?**
A: Every command, edit, and export is timestamped, signed, and journaled for full traceability.

**Q: Is AI required?**
A: No. AI integrations are strictly optional and never required for core features.

# Contribution Guidelines

We welcome contributions from compliance-minded developers. All PRs are subject to code review and audit. See [CONTRIBUTING.md].

# License & Legal

SecuraMem is released under the MIT License. See [LICENSE] for details.

# Contact

Repo: https://github.com/SecuraMem/smem-cli
Email: securamem@gmail.com
SecuraMem (smem): Air‑Gapped Code Memory CLI for Audit & Compliance
Verifiable, secure, and human-in-control code memory for regulated environments.

Overview
SecuraMem (smem) is an air-gapped, AI-agnostic persistent memory tool designed for backend, infrastructure, and regulated teams (finance, healthcare, defense, enterprise). Everything runs locally—no telemetry, zero network egress—with reproducible builds, signed artifacts, SBOMs, and a glass-box audit trail for full compliance.

Audit-first architecture: All commands, code edits, and (optional) AI invocations are timestamped, journaled, and fully traceable.

Human-centric control: AI can never run init (or other critical actions) without explicit developer override.

Automatic code indexing & purging: Context stays fresh; old memory is safely pruned as projects evolve.

Import/export with cryptographic signatures and checksums: Portable and verifiable state for offline workflows.

Extensive user guide: Use smem as a pure human-controlled tool—AI is strictly optional.

Immutable receipts, live status, policy enforcement: Every change is logged, signed, and available for compliance review.

Quick Features
- Air-gapped, local-only storage
- Full audit/history log (searchable by timestamp/action)
- No vendor lock-in; AI integrations are pluggable and optional
- SBOM generation and fully reproducible builds
- Signed exports and integrity verification on import
- Green build status, complete test coverage
- Policy configuration, status printouts (e.g., trust tokens, signing precedence)
- $5/month honor system: Pro features for advanced workflows; free core is never crippled

Why SecuraMem?
For devs and teams in sensitive and compliance-driven environments, SecuraMem gives ironclad control and transparency—far beyond what typical cloud/vendor CLI tools offer. It’s designed for those who need proof, not just convenience.

Getting Started
See [USER_GUIDE.md] for complete install and usage.
Or run:

```bash
smem help
```

Contact
Repo: https://github.com/SecuraMem/smem-cli

Email: securamem@gmail.com

---
Feel free to adapt, expand, or trim as needed—the goal is to make everyone landing on smem-cli instantly realize this is serious infra, built for compliance and control.
# 🧠 CodeContextPro (cctx)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4?style=flat&logo=github%20sponsors)](https://github.com/sponsors/jahboukie)

Air‑gapped, zero‑trust persistent memory CLI for AI agents and developers.

CodeContextPro (cctx) makes code context and decisions durable, auditable, and portable without relying on any cloud services. It’s built for regulated and offline environments where transparency, audit, and operator control are non‑negotiable.

For pricing details and the honor‑system approach, see: docs/pricing.md

## Why CodeContextPro

- Zero‑trust by default: command and file access must be explicitly allowed, with an audit trail.
- Glassbox operations: plan/mirror/explain/dry‑run on every command, receipts + journal + digests.
- Code‑aware recall: index code by files or symbols with Tree-sitter precision parsing, search via FTS and hybrid vector rerank (sqlite‑vss fallback safe).
 - Diff‑aware reindex: cache file digests; skip unchanged files with `--diff` (baseline cache built automatically).
- Tree-sitter AST parsing: Precise symbol boundary detection for TypeScript, JavaScript, Python with graceful fallback.
- Air‑gapped protocol: export/import portable context bundles (.cctxctx) for offline transfer.
- Enterprise security suite: Cryptographic signing, audit logging, MFA support, SOC2/GDPR/HIPAA compliance ready.

## Quick start (CLI = `cctx`)

```powershell
# Install globally
npm install -g codecontextpro

# Initialize in your project (creates .codecontextpro/)
cctx init

# Index code (symbol-aware) and search
cctx index-code --symbols --path .
cctx search-code "functionName" --hybrid --preview 3 --trace

# Inspect receipts and journal
cctx receipt-show --last
cctx journal --show
```

Tip: If something is blocked by policy, CodeContextPro will explain and show a one‑liner fix. You can also run:

```powershell
cctx policy doctor --cmd index-code --path .
cctx policy allow-path ./**
```

More docs: see the `docs/` folder:
- docs/README.md (index)
- docs/getting-started.md
- docs/cli-reference.md
- docs/policy.md
- docs/vscode.md
- docs/airgapped.md
- docs/troubleshooting.md
- docs/comparison.md — CodeContextPro vs. air‑gapped alternatives
 - docs/battle-testing-guide.md — End-to-end local validation checklist
 - docs/screencast-script.md — 2–3 min demo script and shot list (Show HN ready)

## Core features

- Transparency & Operator Parity
	- Global flags: `--trace`, `--dry-run`, `--json`, `--explain`
	- Receipts: `.codecontextpro/receipts/*.json` with digests
	- Journal: `.codecontextpro/journal.jsonl`

- Zero‑Trust Policy Broker (local, auditable)
	- `cctx policy status` — show effective rules
	- `cctx policy allow-command <cmd>` — permit a command
	- `cctx policy allow-path <glob>` — permit a path
	- `cctx policy doctor [--cmd] [--path]` — explain pass/fail and print the fix
	- `cctx policy trust <cmd> --minutes 15` — short‑lived dev convenience token

- Code‑aware Index & Search
	- `cctx index-code [--symbols] [--path .] [--include ...] [--exclude ...]`
		- Add `--diff` to skip unchanged files after an initial baseline run.
	- `cctx search-code <query> [-k N] [--preview N] [--hybrid] [--filter-path ...]`
	- Hybrid FTS + vector rerank; sqlite‑vss when available, otherwise local cosine fallback

- Air‑Gapped Context (.cctxctx)
		- `smem export-context --out ./ctx.smemctx --type code [--zip] [--sign]`
		- `smem import-context ./ctx.smemctx[.zip]` (verification + receipts)
	- Exports now include: `manifest.json`, `map.csv`, `vectors.f32`, `notes.jsonl`, `checksums.json`, optional `signature.bin` + `publickey.der` (if signed)
	- Supports zipped bundle (`ctx.cctxctx.zip`) with identical verification logic
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

- No network egress for core operations; all data lives in `.codecontextpro/` and is encrypted at rest by default.
- Policy‑enforced command and path access with audit log (`.codecontextpro/audit.log`).
- Clear remediation when blocked: CodeContextPro prints the exact `cctx policy ...` fix.

## Command reference (selected)

- Project & status
	- `cctx init` — initialize project
	- `cctx status` — project/memory stats
	- `cctx vector-status` — vector backend info

- Index & search
	- `cctx index-code` — index code into memory
	- `cctx search-code` — search indexed chunks

- Transparency & replay
	- `cctx receipt-show [--last]` — pretty‑print a receipt
	- `cctx journal --show|--clear` — view or clear journal
	- `cctx replay --last|--range N [--dry-run]` — safe replays (prototype)

- Policy
	- `cctx policy status|doctor|allow-command|allow-path|trust`

- Proofs
	- `cctx prove-offline [--json]` — explicit no‑egress proof line for audits

- Air‑gapped
	- `cctx export-context` and `cctx import-context`

- Maintenance & Recovery
	- `cctx db-doctor` — integrity check + automatic repair (backs up corrupted file then rebuilds schema)
	- `cctx digest-cache --list|--clear` — inspect or reset file digest cache used by `--diff`

## Roadmap highlights

Shipped (v1.8.0):
- .cctxctx signing (ed25519) + zipped container format + per‑file checksums + provenance
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



CodeContextPro gives regulated, air‑gapped teams a trustworthy memory layer: transparent, auditable, and under operator control.

## Pricing

CodeContextPro is MIT‑licensed and fully functional for everyone. We use an honor‑system for paid tiers — there are no license checks, no DRM, and no telemetry. If CodeContextPro saves you time or unlocks offline workflows, please consider sponsoring to fund maintenance. Paid benefits are delivered outside the binary (signed builds, templates, support), so the CLI remains air‑gapped.

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
- Enhanced .cctxctx (zipped, checksums, merge, verify reports)

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

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->

<!-- delta test mutation -->
