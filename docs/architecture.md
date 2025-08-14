# SecuraMem CLI Architecture: from monolithic to modular (and beyond)

This document outlines how to break down the large `src/index.ts` into a modular structure and what it would take to move selected parts into local microservices without violating the air‑gapped, local‑only posture.

## Why `index.ts` is large today
- It wires commander CLI, defines many commands, and embeds handlers and helpers in one place.
- Early velocity favored co-location of logic; later refactors already split a few commands under `src/commands/`.
- Everything runs local-only, so deployment friction from multiple processes was avoided.

## Recommended target: modular monolith
Keep one process, but isolate domains behind internal services and per-command modules. Benefits: testability, readability, safer changes, and a clear path to optional multi-process later.

Suggested layout:
- src/cli/
  - CommandRegistry.ts (wires commander and routes to handlers)
- src/commands/
  - Status.ts, Init.ts, VectorStatus.ts, IndexCode.ts, WatchCode.ts, ReindexFile.ts, ReindexFolder.ts
  - ExportContext.ts, ImportContext.ts
  - Policy/*.ts (Status, AllowCommand, AllowPath, Doctor, Trust)
  - Key/*.ts (Status, Rotate, List, Prune)
  - Journal.ts, ReceiptShow.ts, Replay.ts (already exist)
- src/services/
  - MemoryService.ts (wraps MemoryEngine/MemoryEngine2 lifecycle)
  - IndexingService.ts (CodeIndexer/SymbolIndexer/TreeSitterIndexer orchestration)
  - VectorService.ts (embeddings + ANN backend abstraction)
  - ExportImportService.ts (bundle/zip, checksums, signing)
  - PolicyService.ts (PolicyBroker façade + helpers)
  - KeyService.ts (ED25519 keys lifecycle)
  - AuditService.ts (Tracer receipts/journal)
- src/utils/
  - Paths.ts (centralized paths & legacy migration), Trace.ts, PolicyBroker.ts (existing)

Cross-cutting: the CLI should consume services; services must not import the CLI. Keep data contracts small and typed.

## Optional: local microservices (process boundaries)
If you need isolation or parallelism beyond worker threads, you can move heavy/critical components into separate local processes.

Good candidates:
- Indexing Worker (Tree-sitter parsing, chunking)
- Embeddings/Vector Worker (model init, vector ops)
- DB Service (single writer to SQLite; queues writes, supports async reads)
- Policy Service (centralized policy checks + audit)

IPC options (local-only, no WAN):
- Node worker_threads (fast, shared memory for transfers)
- child_process with stdio JSON-RPC (simple, portable)
- Named pipes/Unix sockets with gRPC or tiny JSON-RPC (more ceremony)

Keep zero-egress: never bind to external interfaces. Use Windows named pipes or 127.0.0.1 + firewall off by default.

Pros:
- Crash containment; better UX during long tasks (watch-code, indexing)
- Parallelism without blocking the CLI event loop

Cons:
- More complexity (lifecycle, supervision, logging, upgrades)
- SQLite concurrency requires discipline (single writer)
- Harder test harness and packaging

## Incremental migration plan
1) Extract command handlers
   - Move each handler out of `index.ts` into `src/commands/...`
   - Keep commander wiring in `index.ts` (or a new `src/cli/CommandRegistry.ts`).
2) Introduce services
   - Carve out `MemoryService`, `PolicyService`, `ExportImportService`, `KeyService`, `IndexingService`.
   - Replace inline logic with service calls.
3) Concurrency upgrades (optional)
   - Move Tree-sitter and embedding generation into `worker_threads` workers.
   - Add a simple work queue interface; keep API typed and message-safe.
4) Local microservices (optional)
   - Spawn a DB service process to serialize writes and expose read ops.
   - Add an Indexing Worker process. Keep CLI thin.
5) Tests & tooling
   - Keep the existing air-gapped harness. Add service smoke tests.
   - Ensure reproducible builds and zero-egress posture remain intact.

## Edge cases & guarantees
- SQLite: single writer; queue writes; use WAL mode; graceful shutdown flush.
- Windows: prefer named pipes or stdio RPC; avoid ephemeral ports where possible.
- Policy: enforce checks in the CLI and in services (defense-in-depth).
- Security: no network egress introduced; all IPC is local.

## Suggested first PR
- Move status/init/vector-status/index-code into `src/commands/`.
- Add `src/services/ExportImportService.ts` and `KeyService.ts` and switch export/import/key commands to use them.
- Keep behavior identical; update tests.

This path gives you immediate readability wins while preserving portability and the air-gapped contract. Later, you can choose specific services to run in workers or separate processes if the workload merits it.
