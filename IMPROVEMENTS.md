Executive Summary
AGM is an AI‑native tool with Developer Parity: anything the agent does is transparent, reproducible, and verifiable by a human. We will lead with an Agent Transparency & Operator Parity layer, then ship code‑aware semantic recall and zero‑trust execution. This sequence builds trust first and upgrades recall second.

Immediate priorities (memory‑only scope):
1) Agent Transparency & Operator Parity (trace/dry‑run/journal/receipts)
2) Code‑aware FAISS/sqlite‑vss hybrid recall
3) Zero‑Trust policy enforcement for memory/index operations (no code execution)
4) Air‑Gapped Context (.agmctx) with integrity signatures (verify/import)
5) Context Replay for auditability

This reframing eliminates the "AI black box" criticism and makes AGM safe and intuitive for both AI agents and experienced developers—supporting the air‑gapped, regulated use cases and the $5k/seat value.

Quick Vetting: Impact, Effort, Risk
Agent Transparency & Operator Parity
Impact: Very High (trust, adoption, compliance)
Effort: Low‑Medium
Risk: Low
Code‑Aware Semantic Vector Memory (Tree‑sitter + FAISS)
Impact: Very High (differentiating recall quality)
Effort: Medium‑High
Risk: Medium (cross‑platform builds, perf)
Zero‑Trust Policy (Memory‑only)
Impact: High (privacy and compliance)
Effort: Low‑Medium
Risk: Low
Air‑Gapped Agent Protocol (.agmctx)
Impact: High (safe portability)
Effort: Medium
Risk: Low‑Medium (format design, integrity)
Context Replay System
Impact: High (audit, forensics)
Effort: Medium
Risk: Medium (storage, versioning)
Live Code‑Aware Recall
Impact: High (dev productivity)
Effort: Medium
Risk: Low‑Medium (editor integrations)
Secure Agent Middleware Hooks
Impact: High (ecosystem play, governance)
Effort: Medium
Risk: Low‑Medium (API stability)
Internal Memory Linter
Impact: Medium‑High (quality, footprint control)
Effort: Medium
Risk: Low
Priority recommendation: 1, 2, 3, 4, 5, then 7, 10, 9, 8.

Recommendations and Design Notes
1) Agent Transparency & Operator Parity (Sprint 1)
What:
- Global flags: --trace, --dry-run, --json, --explain on all commands
- Command Journal: .antigoldfishmode/journal.jsonl with timestamp, cwd, argv, digests, exit code
- Receipts: .antigoldfishmode/receipts/<ts>.json for mutating ops (inputs, outputs, counts, hashes)
- “Mirror this” hints: print the exact agm command a human can run
Why: Build trust first, eliminate black‑box behavior, enable audits and reproducibility
How:
- Add a small tracing utility used by CLI handlers
- Wrap DB writes/reads to emit counts and hashes (no schema change required)
- Journal append after command exits; respect --dry-run (write a simulation receipt only)
- Update README with “agent vs human” parity workflows

Transparency & Replay (Glassbox) — Current Status
- Plan & Mirror: Every core command prints plan and a copy‑pastable mirror line in trace/explain mode
- Dry‑Run by Default (where sensitive): replay defaults to --dry-run; index/search support dry-run
- Receipts v1: Standardized receipts (schema, version, argv, params, resultSummary, success, digests)
- Journal Trail: .antigoldfishmode/journal.jsonl appends one line per command with the saved receipt reference
- Integrity Digests:
  - index-code: fileListDigest (sha256 over considered file list)
  - search-code: resultDigest (sha256 over ordered result IDs and file:line)
  - replay: batch digest over replayed receipt IDs
- Replay UX: normalized mirrors, deduped flags, per-step summaries, safe-by-default replays
- Inspection: agm receipt-show <idOrPath> pretty-prints receipts

Examples
- Index:
  - agm index-code --path . --max-chunk 200 --trace --json
  - agm index-code --path . --max-chunk 200 --trace --explain
- Search:
  - agm search-code "SymbolName" -k 10 --preview 3 --trace
  - agm search-code "SymbolName" -k 10 --preview 3 --filter-path src/**/*.ts --trace --json
- Replay:
  - agm replay --last --trace (dry-run)
  - agm replay --range 3 --trace (shows incremental summaries)
- Inspect:
  - agm journal --show
  - agm receipt-show <id>

Near-term Transparency Roadmap
- Final aggregate replay summary line (batch totals)
- Expand explain text to be consistent and concise across all commands
- Add receipt schema v1 to docs with field meanings
- Optionally: agm receipt-show --last for quick inspection

Acceptance:
- Every mutating command prints Plan, “Mirror this”, and Receipt path
- --dry-run produces identical plan output with no side effects
- agm journal show lists last N entries with digests; clear with confirmation

2) Code‑Aware Semantic Vector Memory (Tree‑sitter + FAISS)
What:
- Parse code into functions/classes/tests/docs with Tree-sitter
- Create embeddings per symbol-level chunk; store in sqlite‑vss FAISS index
- Hybrid search: FTS5 + kNN with simple rank fusion
Why: Function‑level recall increases signal, reduces irrelevant matches
How:
- Extend current CodeIndexer with Tree‑sitter parsers incrementally
- Vendor sqlite‑vss prebuilt binaries; loader already scaffolded; graceful fallback
- Add --semantic flag to search that uses hybrid ranking
Acceptance:
- index-code produces symbol‑scoped chunks with metadata
- search-code --semantic returns better top‑K on function queries (measurable)

2) Zero‑Trust Policy (Memory‑only)
What:
Offline‑strict mode enabled by default; deny all network egress for AGM features
Allow‑list policy for commands and paths that affect local memory/indexing operations
Full audit: plan → mirror → receipts → journal for all mutating ops
Why: Regulated orgs need least‑privilege, provable no‑egress operation
How:
Policy JSON with allowed commands/globs; doctor and trust helpers
Network guard wrapping http/https to block egress by default
Prove‑offline report: environment checks and guard status
3) Code‑Aware Semantic Vector Memory (Tree‑sitter + FAISS)
What:
Parse code into functions/classes/tests/docs with Tree-sitter
Create embeddings per symbol-level chunk: content + docstring + local call context
FAISS-backed ANN via sqlite-vss for fast, scalable local search
Why: Function-level recall improves signal and reduces irrelevant matches
How:
CodeIndexer pipeline:
Walk repo (ignore node_modules/.git)
Per-language Tree-sitter parser; chunk by symbol; capture file, lang, line range, symbol name, type
Embed to Float32 vectors; store in SQLite (BLOB) and add to sqlite-vss table
Hybrid search:
Combine FTS5 on code text with FAISS kNN on structured vectors
Filters: language, file path, symbol type
Output:
agm search-code “” → ranked function-level results with file:line and quick preview
4) Air‑Gapped Context (.agmctx)
What: A self-contained, signed artifact for context transfer in air-gapped environments
Format:
manifest.json: schemaVersion, dims, counts, roles, filters used, hash of each payload asset
vectors.f32: contiguous Float32 array (row-major) or chunked blocks
map.csv: id,file,path,lang,line_start,line_end,symbol,type,timestamp
notes.jsonl: non-code memories and summaries
signatures.json: ed25519 signatures over manifest and assets
Why: Enable agents to load rich context with zero network
How:
agm export --roles SecurityReviewBot,UXBot --path src/ --out ctx.agmctx
agm import ctx.agmctx: verify signatures and counts, load vectors and metadata
Notes:
Support incremental/agreed‑upon schema versions for compatibility
Optional lossy compression for large repos (quantization, PCA)
5) Multi‑Agent Role Memory Profiles
What: Role-scoped views of memory based on tags/contexts/paths
Role: SecurityReviewBot → auth, crypto, policy code; excludes UI strings
How:
Policy model: role → include/exclude rules (type, path, language, tags)
CLI: agm assign-role UXBot ./project/ui/ and agm role describe UXBot
Enforce at query time and during export (.agmctx)
Why: Reduces blast radius and cognitive noise; aligns with least privilege
6) Context Replay System
What: Reconstruct memory state as of timestamp T to reproduce agent context
How:
Add an append-only event log (create/update/delete/migrate) with content_hash and metadata deltas
agm replay --at "2025-08-01T12:00:00Z" produces a read-only snapshot and a replay report (which index versions, which memories visible)
Why: Audits and postmortems require reproducibility
Notes:
Store replay indices as temp DBs; do not mutate production
Combine with Zero-Trust audit logs for end-to-end traceability
7) Live Code‑Aware Recall
What:
Watch current file in the editor/CLI and bias recall to nearby functions/imports
agm recall --related-to openFile.js or a background daemon providing suggestions
How:
Editor integration (VS Code): get active file + cursor symbol via LSP/VS Code API
CLI mode: specify file path and optional line range
Enhance ranking with proximity (same file/module) and import graph (optional)
Why: Low-latency, high-relevance recall that follows the developer
8) CLI Shell Embedding
What:
agm shell: a memory-enhanced terminal with context-aware autocomplete and #recall
How:
Start a subshell where Tab completion also queries AGM index
#recall “token” prints snippets ready for paste; no auto-execution
Notes:
Keep Zero-Trust enforcement; no AI-suggested execution unless approved
Position as optional UX feature after core security/FAISS work
9) Secure Agent Middleware Hooks
What:
beforePrompt, sanitizeMemory, customEmbedding, memoryMasking hooks
How:
Pluggable middleware pipeline around recall and export
Org policy can lock configuration; hooks run offline
Why: Enterprise needs policy guardrails and extensibility
10) Internal Memory Linter
What: Quality checks and fixes for memory corpus
Rules:
Contradictions: heuristic text checks; flag human review
Outdated: memory older than last file change; suggest reindex
Redundant: near-duplicate content_hash or high cosine similarity
CLI:
agm lint-memory [--fix redundant] [--report]
Why: Keeps context lean and reliable; reduces hallucination fuel
Roadmap (Phased)
Phase 1 (Weeks 1–3)
FAISS/sqlite-vss backend with IVectorIndex abstraction
Tree-sitter based CodeIndexer; function-level embeddings
agm index-code, agm search-code, backend selection and migration
Phase 2 (Weeks 4–6)
Zero-Trust execution: offline-strict default, command whitelist, audit logs
AGAP: .agmctx export/import with signing and verification
Role profiles: assign-role, enforce filters in queries and exports
Phase 3 (Weeks 7–9)
Context Replay with event log and reconstruction
Live code-aware recall (VS Code + CLI biasing)
Internal memory linter
Phase 4 (Weeks 10–12)
CLI Shell embedding (opt-in, hardened)
Secure agent middleware hooks (org lockable)
Extended docs, SBOM, compliance guide for regulated buyers
Deliverables per phase: features, tests, offline verification, admin/operator docs.

Risks and Mitigations
Cross-platform packaging (sqlite-vss, Tree-sitter)
Mitigation: vendor prebuilt binaries for Win/macOS/Linux x64/arm64; robust loader and fallback
Performance on very large repos
Mitigation: chunking strategy, language-aware filters, optional PCA/quantization; background indexing with progress
Policy usability vs safety
Mitigation: defaults to safest mode; policy templates; dry-run previews; audit dashboards
Format stability (.agmctx)
Mitigation: versioned manifest; backward compatibility layer; integrity checks and signatures
Positioning (non-commercial):
Free, local‑only tool emphasizing privacy, transparency, and high‑quality recall. No licenses, subscriptions, or telemetry.
Immediate Next Steps
Confirm OS/arch coverage for prebuilt sqlite‑vss binaries (optional)
Finalize receipt schema v1 and document policy defaults
Lock .agmctx v0 schema (manifest.json, vectors.f32, map.csv, notes.jsonl; signatures optional)
Ship symbol‑aware indexing (Tree‑sitter) and hybrid recall behind flags
Provide updated docs emphasizing memory‑only, zero‑egress posture