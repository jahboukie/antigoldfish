# AGM vs. air‑gapped alternatives

This guide compares AntiGoldfishMode (AGM) with common ways teams achieve air‑gapped or no‑egress AI workflows. It’s vendor‑neutral and focuses on capabilities, operational posture, and developer ergonomics.

## TL;DR

- AGM is a local, memory‑only CLI with zero‑egress by default and encryption‑at‑rest, designed for developers inside their editor/workspace.
- Alternatives tend to be either DIY stacks (Ollama + RAG libs + local vector DB) or enterprise platforms with self‑hosting options.
- If you want simple, auditable, local memory with policy controls and no servers to run, AGM is likely the lowest‑friction choice.
- If you need multi‑user model hosting, complex RAG pipelines, dashboards, or centralized governance, a platform or DIY stack is better suited.

## Offerings compared

We compare four approaches many teams consider for air‑gapped development:

1) AGM (AntiGoldfishMode)
- Local‑only memory engine and CLI for code context. No model serving. Zero‑egress default.

2) DIY open‑source stack (example composition)
- Ollama (local models) + LlamaIndex/LangChain (RAG pipeline) + Chroma/Qdrant (local vector DB) + VS Code glue.

3) Enterprise on‑prem/offline RAG platform
- Commercial platforms with self‑hosted deployments, built‑in vector DB, pipelines, governance, and dashboards.

4) Self‑hosted code search + offline assistants
- Enterprise code search (on‑prem) plus optional offline/limited LLM usage; focuses on code navigation rather than persistent AI memory.

Notes:
- Exact vendors/tools vary; this doc avoids specific endorsements and emphasizes typical capability profiles.

## Capability matrix (high‑level)

- Scope
  - AGM: Local memory for code/projects; CLI + VS Code tasks/keybindings.
  - DIY stack: End‑to‑end (models + RAG + storage) if you assemble components.
  - Enterprise platform: End‑to‑end with admin dashboards and governance.
  - Code search: Strong code nav; AI memory varies; model hosting typically external or separate.

- No‑egress default
  - AGM: Yes (policy blocks network by default; basic egress guard at runtime).
  - DIY stack: Possible with care; depends on each component’s config.
  - Enterprise platform: Possible; depends on deployment mode and licensing.
  - Code search: Often yes for core search; AI parts may require careful isolation.

- Encryption at rest
  - AGM: Yes by default (SQLite encrypted file; machine‑bound, integrity checked).
  - DIY stack: Your responsibility (enable DB/file encryption per component).
  - Enterprise platform: Usually configurable/managed.
  - Code search: Typically supported for data storage.

- Policy controls (commands, globs, trust tokens)
  - AGM: Built‑in Zero‑Trust policy (allow‑command/path, doctor, audit log, short‑lived trust tokens).
  - DIY stack: N/A by default; you’d add shell policy/SELinux/AppArmor + app‑level controls.
  - Enterprise platform: Platform‑level RBAC/governance, but dev‑shell command policy is out of scope.
  - Code search: Access control and permissions; not focused on developer shell policy.

- Indexing/search of code
  - AGM: Local FTS + hybrid search; code indexer; exportable context (.agmctx v0).
  - DIY stack: Yes via RAG libs and embeddings; customizable and powerful.
  - Enterprise platform: Yes; often comprehensive (repo sources, doc stores).
  - Code search: First‑class, with advanced code nav.

- Model hosting/inference
  - AGM: None (intentionally). Works alongside whatever LLM you use.
  - DIY stack: Yes (Ollama/others) — full local inference possible.
  - Enterprise platform: Yes (self‑host or managed); offline modes vary.
  - Code search: Sometimes integrates with models; often external.

- Multi‑user/team features
  - AGM: Local per‑dev memory; export/import only.
  - DIY stack: Possible to multi‑tenant if you architect it.
  - Enterprise platform: Built for teams/orgs.
  - Code search: Built for teams; AI memory varies by product.

- Operations
  - AGM: No server; local SQLite file; CLI tasks; CI builds only.
  - DIY stack: You operate model server(s), vector DB, pipelines.
  - Enterprise platform: You operate the platform; vendor support.
  - Code search: You operate the service; integrations vary.

- Auditability
  - AGM: Local audit log, receipts/journal; policy doctor.
  - DIY stack: You add logging/controls; highly flexible.
  - Enterprise platform: Centralized audit/GRC features.
  - Code search: Audit/logging typical; AI usage logging varies.

## When to choose AGM

- You want zero‑egress AI memory inside developer workflows (VS Code) without standing up servers.
- You need encryption‑at‑rest by default and an auditable, local policy for file/command access.
- You prefer a simple CLI with receipts/journals and exportable context to share or verify offline.
- You already have (or don’t need) model hosting; you just need trustworthy memory and search.

## When to consider alternatives

- You need to host models on‑prem for many users and manage GPUs, quotas, and routing.
- You need complex RAG workflows (multi‑corpus, agents, chunking strategies) with observability.
- You want centralized admin, SSO, project‑level governance, dashboards, and compliance tooling.
- You require team‑level shared memory with merging/conflict resolution and policy at org scope.

## Interop: using AGM with other stacks

- With DIY stacks: Keep Ollama and vector DB air‑gapped; use AGM for per‑dev memory/export. No egress by default on both ends.
- With enterprise platforms: Treat AGM as developer‑local memory; export relevant snippets (.agmctx) to platform‑approved pipelines if allowed.
- With code search: Use AGM as sticky memory for insights; code search remains the source of truth for repository navigation.

## Selection checklist

- Data boundaries:
  - Does the solution run fully offline? Can you prove no egress?
  - Is encryption‑at‑rest enabled by default? How is the key derived and stored?

- Operational complexity:
  - Do you want zero servers (AGM) or can you staff a stack/platform?
  - How do upgrades and rebuilds impact developer machines (e.g., SQLite/FTS extensions)?

- Policy and audit:
  - Can developers see why an action is blocked and the exact “fix” line?
  - Are audit trails local, tamper‑evident, and exportable?

- Developer ergonomics:
  - Are editor tasks/keybindings available? Is the CLI friendly on macOS/Windows/Linux?
  - Are results fast and relevant for code context queries?

## AGM’s current limitations

- No model hosting — by design.
- Team‑shared memory is export/import (verify‑only) today; packaging/signing planned.
- Policy is project‑local; org‑wide centralized policy is on the roadmap.

## Roadmap highlights (public)

- .agmctx packaging/signing with checksums and optional signatures.
- Prove‑offline command (explicit no‑egress proof line + module/env checks).
- Broader test coverage, WAL/PRAGMA guidance, and performance notes.

If you need a vendor‑specific matrix (named products and exact features), open an issue with the shortlist you want to evaluate and any constraints (compliance, OS, GPU availability).

## Competitor pricing snapshot (reference)

Note: Pricing changes frequently. Treat this as a quick reference and verify on the vendor sites. Updated: 2025-08-10.

- GitHub Copilot
  - Free: $0 (limited agent/chat/completions)
  - Pro: $10/month or $100/year
  - Pro+: $39/month or $390/year
  - Source: https://github.com/features/copilot/plans

- Cursor
  - Hobby: Free (limited)
  - Pro: $20/month
  - Ultra: $200/month
  - Teams: $40/user/month; Enterprise: custom
  - Source: https://cursor.com/pricing

- Windsurf (Codeium)
  - Free: $0
  - Pro: $15/user/month (credits-based)
  - Teams: $30/user/month; Enterprise: from $60/user/month
  - Source: https://codeium.com/pricing (redirects to Windsurf plans)

- Supermaven
  - Free: $0
  - Pro: $10/month; Team: $10/user/month
  - Note: Site documents a 7-day data retention policy for code suggestions
  - Source: https://supermaven.com/pricing

- Tabnine
  - Dev: $9/month
  - Enterprise: $39/user/month (annual commitment)
  - Notes: Offers private/VPC/on‑prem and fully air‑gapped deployments on Enterprise
  - Source: https://www.tabnine.com/pricing

Context: AGM is free/open‑source and runs fully local with zero‑egress by default. The tools above are primarily coding assistants/IDEs with cloud inference by default; some provide private or on‑prem options at higher tiers.
