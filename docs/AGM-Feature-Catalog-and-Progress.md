# AGM Feature Catalog and Progress (for GPT‑5, Web)

Last updated: 2025‑08‑11 • Version: 1.7.0 • Scope: Local‑only, air‑gapped CLI (memory‑first)

## Executive overview

- Mission: Privacy‑first, air‑gapped memory engine with glass‑box transparency, zero‑trust policy, and portable context artifacts.
- Readiness (memory‑only MVP: priorities 1–5 from IMPROVEMENTS.md): ~78% complete
  - 1) Transparency & Operator Parity: ~95% (shipping)
  - 2) Code‑aware hybrid recall (FTS + vectors; symbol‑aware pending): ~55% (shipping core, symbol parsing planned)
  - 3) Zero‑Trust policy (memory/index ops only): ~75% (shipping; more docs/hardening planned)
  - 4) Air‑Gapped Context (.agmctx) portability: ~60% (unsigned v0 shipping; signing/verification next)
  - 5) Context Replay (auditable): ~50% (journal/replay shipping; time‑travel snapshots planned)
- Readiness (full roadmap phases 1–4): ~45%

Assumptions: Estimates are based on 1.7.0 code, passing CI on Node 18/20/22 across Windows/macOS/Linux, and current CLI surface.

---

## Feature catalog

### 1) Agent Transparency & Operator Parity (Glass‑box)
- Global flags on all commands:
  - `--trace` (show plan + side‑effects), `--explain` (human‑readable rationale), `--dry-run` (no side‑effects), `--json` (machine receipts)
- Plan & Mirror lines: every core command prints what will happen and the exact `agm` command a human can run.
- Receipts v1: saved under `.antigoldfishmode/receipts/*.json` with argv, inputs, counts, digests, success, result summary.
- Journal trail: `.antigoldfishmode/journal.jsonl` appends one entry per command with receipt reference and exit code.
- Inspection utilities:
  - `agm receipt-show [idOrPath]` – pretty prints a saved receipt
  - `agm journal --show` – show recent entries; `agm replay` – safe re‑execution (dry‑run by default)
- Integrity digests included where relevant (e.g., fileListDigest on index, resultDigest on search, batch digest on replay)

Status: Shipping; minor polish queued for receipt schema docs and aggregate replay summaries.

### 2) Indexing & Search (Code‑aware, hybrid)
- Indexing:
  - `agm index-code` – chunk and index repository source files locally (configurable filters/sizes)
  - `agm watch-code` – incremental indexing with persistent digest cache
  - `agm reindex-file` / `agm reindex-folder` – force reindex with cache bypass
  - `agm digest-cache` – manage the on‑disk digest cache
- Search:
  - `agm search-code <query>` – code‑aware recall, optional `--hybrid` rerank, preview lines, filter by path/glob
- Vector backend:
  - SQLite primary store; optional `sqlite-vss` for ANN k‑NN; graceful fallback if unavailable
  - `agm vector-status` – report vector backend readiness and index stats

Status: Core indexing/search shipping (FTS + simple vector rerank). Symbol‑aware (Tree‑sitter) parsing is planned to improve function‑level recall and metadata.

### 3) Zero‑Trust Policy (memory/index scope)
- Offline‑strict posture by default; no egress in normal operations
- Policy file: `.antigoldfishmode/policy.json` with command/path allow‑lists
- Helpers:
  - `agm policy` subcommands (status, allow‑command, etc.)
  - `agm prove-offline` – prints a no‑egress proof line with environment/policy checks

Status: Shipping and enforced for CLI flows covered by policy broker. Next: expand docs, add guard shims for any future network hooks.

### 4) Air‑Gapped Context Portability (.agmctx)
- Commands:
  - `agm export-context` – produce `.agmctx` directory (v0): `manifest.json`, `map.csv`, `notes.jsonl`, `vectors.f32`
  - `agm import-context <path>` – verify structure and import unsigned v0 contexts
- Format:
  - Versioned manifest, counts, and hashes; vectors stored as contiguous Float32; map/notes as CSV/JSONL

Status: Unsigned v0 shipping. Signing/verification (ed25519) is planned as the default integrity layer.

### 5) Context Replay & Auditability
- `agm replay` – re‑execute recent journaled commands safely (dry‑run default), with per‑step summaries and digest checks
- Roadmap: time‑travel snapshots (`--at <timestamp>`) via event log and read‑only reconstruction

Status: Shipping (journal‑based replay). Snapshotting/time‑travel is planned.

### 6) Health & Observability
- `agm status` – project snapshot: paths, DB, pro status, counts
- `agm health` – quick roll‑up: DB stats, vectors, digest cache, and readiness hints
- `agm vector-status` – detailed vector backend and index status
- `agm gc` – maintenance (drop stale digests, prune orphan vectors, optional VACUUM)

Status: Shipping.

### 7) Pro mode (honor‑system)
- A simple local marker to toggle pro mode features; no network, no license checks.

Status: Shipping baseline; reserved for future local‑only enhancements.

### 8) CLI ergonomics
- `agm --help` / `--version` / `ai-guide` (operating instructions for assistants)
- Rich `--trace/--explain` experiences for demos and reproducibility

Status: Shipping.

### 9) CI, packaging, and platform support
- Node 18/20/22; Windows/macOS/Linux runners all green
- TypeScript NodeNext ESM build
- Chalk pinned to CJS (4.1.2) to avoid ESM/CJS mismatch in dist
- SQLite: `better-sqlite3` primary; optional `sqlite-vss` for ANN; CI‑safe postinstall
- Portable test runner (`scripts/run-tests.js`) ensures cross‑platform discovery

Status: Shipping.

---

## Delta since IMPROVEMENTS.md (notable additions)
- Health metrics rollups: `health`/`vector-status` with actionable readiness hints
- Digest cache management and `gc`: to maintain performance and reduce drift
- Reindex commands: targeted file/folder reindex
- Portable test runner and CI hardening; reproducible ESM build (NodeNext)
- Expanded glass‑box UX: consistent `--trace/--explain`, receipts/journal tooling
- Prove‑offline helper and policy broker improvements
- Demo and battle‑testing docs; smoke scripts

---

## Gaps and near‑term roadmap
- Symbol‑aware indexing (Tree‑sitter) for function‑level chunks, metadata, and improved reranking
- `.agmctx` signing/verification (ed25519) as default; signature inspection in CLI
- Time‑travel replay with event log and read‑only snapshot reconstruction
- Role memory profiles (include/exclude by type/path/tags) and export enforcement
- Live code‑aware recall (editor + CLI proximity bias)
- Secure agent middleware hooks (beforePrompt/sanitize/customEmbedding)
- Internal memory linter (contradiction/outdated/redundant; optional `--fix`)
- Optional CLI shell embedding (hardened, opt‑in)

---

## Compatibility and security posture
- Local‑only, no telemetry, no egress by default (prove‑offline available)
- Node.js 18+; tested on 18/20/22 across Windows/macOS/Linux
- SQLite/FTS5 primary; optional ANN via sqlite‑vss with graceful fallback
- Transparent by design: every mutating op can be explained, mirrored, journaled, and replayed

---

## Command surface (summary)
- Core: `status`, `init`, `remember`, `recall`, `journal`, `replay`, `receipt-show`
- Indexing: `index-code`, `watch-code`, `search-code`, `digest-cache`, `reindex-file`, `reindex-folder`, `gc`
- Vectors/health: `health`, `vector-status`
- Portability: `export-context`, `import-context`
- Policy: `policy ...`, `prove-offline`
- Misc: `ai-guide`, `pro`

Notes: All commands support glass‑box flags (`--trace`, `--explain`, `--dry-run`, `--json`) where applicable.
