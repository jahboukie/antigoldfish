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
- Policy Controls
	- `cctx policy status` — show effective rules
	- `cctx policy allow-command <cmd>` — permit a command
	- `cctx policy allow-path <glob>` — permit a path
	- `cctx policy doctor [--cmd] [--path]` — explain pass/fail and print the fix
	- `cctx policy trust <cmd> --minutes 15` — short‑lived dev convenience token
- Code workflows
	- `cctx index-code [--symbols] [--path .] [--include ...] [--exclude ...]`
	- `cctx search-code <query> [-k N] [--preview N] [--hybrid] [--filter-path ...]`
- Air‑Gapped Context (.cctxctx)
	- `cctx export-context` and `cctx import-context`
	- Supports zipped bundle (`ctx.cctxctx.zip`) with identical verification logic
- Health & Maintenance
	- `cctx db-doctor` — integrity check + automatic repair (backs up corrupted file then rebuilds schema)
	- `cctx digest-cache --list|--clear` — inspect or reset file digest cache used by `--diff`
- Prove Offline
	- `cctx prove-offline [--json]` — explicit no‑egress proof line for audits

Roadmap highlights included enhanced .cctxctx (zipped, checksums, merge, verify reports) and continued improvements for regulated, air‑gapped teams.

Archived for historical context after migration to SecuraMem (smem).
