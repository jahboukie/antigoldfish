# SecuraMem vs. air‑gapped alternatives

This guide compares SecuraMem (smem) with common ways teams achieve air‑gapped or no‑egress AI workflows. It’s vendor‑neutral and focuses on capabilities, operational posture, and developer ergonomics.

## TL;DR


## Offerings compared

We compare four approaches many teams consider for air‑gapped development:

1) SecuraMem (smem)

2) DIY open‑source stack (example composition)

3) Enterprise on‑prem/offline RAG platform

4) Self‑hosted code search + offline assistants

Notes:

## Capability matrix (high‑level)

  - SecuraMem: Local memory for code/projects; CLI + VS Code tasks/keybindings.
  - DIY stack: End‑to‑end (models + RAG + storage) if you assemble components.
  - Enterprise platform: End‑to‑end with admin dashboards and governance.
  - Code search: Strong code nav; AI memory varies; model hosting typically external or separate.

  - SecuraMem: Yes (policy blocks network by default; basic egress guard at runtime).
  - DIY stack: Possible with care; depends on each component’s config.
  - Enterprise platform: Possible; depends on deployment mode and licensing.
  - Code search: Often yes for core search; AI parts may require careful isolation.

  - SecuraMem: Yes by default (SQLite encrypted file; machine‑bound, integrity checked).
  - DIY stack: Your responsibility (enable DB/file encryption per component).
  - Enterprise platform: Usually configurable/managed.
  - Code search: Typically supported for data storage.

  - SecuraMem: Built‑in Zero‑Trust policy (allow‑command/path, doctor, audit log, short‑lived trust tokens).
  - DIY stack: N/A by default; you’d add shell policy/SELinux/AppArmor + app‑level controls.
  - Enterprise platform: Platform‑level RBAC/governance, but dev‑shell command policy is out of scope.
  - Code search: Access control and permissions; not focused on developer shell policy.

  - SecuraMem: Local FTS + hybrid search; code indexer; exportable context (.smemctx v0).
  - DIY stack: Yes via RAG libs and embeddings; customizable and powerful.
  - Enterprise platform: Yes; often comprehensive (repo sources, doc stores).
  - Code search: First‑class, with advanced code nav.

  - SecuraMem: None (intentionally). Works alongside whatever LLM you use.
  - DIY stack: Yes (Ollama/others) — full local inference possible.
  - Enterprise platform: Yes (self‑host or managed); offline modes vary.
  - Code search: Sometimes integrates with models; often external.

  - SecuraMem: Local per‑dev memory; export/import only.
  - DIY stack: Possible to multi‑tenant if you architect it.
  - Enterprise platform: Built for teams/orgs.
  - Code search: Built for teams; AI memory varies by product.

  - SecuraMem: No server; local SQLite file; CLI tasks; CI builds only.
  - DIY stack: You operate model server(s), vector DB, pipelines.
  - Enterprise platform: You operate the platform; vendor support.
  - Code search: You operate the service; integrations vary.

  - SecuraMem: Local audit log, receipts/journal; policy doctor.
  - DIY stack: You add logging/controls; highly flexible.
  - Enterprise platform: Centralized audit/GRC features.
  - Code search: Audit/logging typical; AI usage logging varies.

## When to choose SecuraMem


## When to consider alternatives


## Interop: using SecuraMem with other stacks


## Selection checklist

  - Does the solution run fully offline? Can you prove no egress?
  - Is encryption‑at‑rest enabled by default? How is the key derived and stored?

  - Do you want zero servers (SecuraMem) or can you staff a stack/platform?
  - How do upgrades and rebuilds impact developer machines (e.g., SQLite/FTS extensions)?

  - Can developers see why an action is blocked and the exact “fix” line?
  - Are audit trails local, tamper‑evident, and exportable?

  - Are editor tasks/keybindings available? Is the CLI friendly on macOS/Windows/Linux?
  - Are results fast and relevant for code context queries?

## SecuraMem’s current limitations


## Roadmap highlights (public)


If you need a vendor‑specific matrix (named products and exact features), open an issue with the shortlist you want to evaluate and any constraints (compliance, OS, GPU availability).

## Competitor pricing snapshot (reference)

Note: Pricing changes frequently. Treat this as a quick reference and verify on the vendor sites. Updated: 2025-08-10.

  - Free: $0 (limited agent/chat/completions)
  - Pro: $10/month or $100/year
  - Pro+: $39/month or $390/year
  - Source: https://github.com/features/copilot/plans

  - Hobby: Free (limited)
  - Pro: $20/month
  - Ultra: $200/month
  - Teams: $40/user/month; Enterprise: custom
  - Source: https://cursor.com/pricing

  - Free: $0
  - Pro: $15/user/month (credits-based)
  - Teams: $30/user/month; Enterprise: from $60/user/month
  - Source: https://codeium.com/pricing (redirects to Windsurf plans)

  - Free: $0
  - Pro: $10/month; Team: $10/user/month
  - Note: Site documents a 7-day data retention policy for code suggestions
  - Source: https://supermaven.com/pricing

  - Dev: $9/month
  - Enterprise: $39/user/month (annual commitment)
  - Notes: Offers private/VPC/on‑prem and fully air‑gapped deployments on Enterprise
  - Source: https://www.tabnine.com/pricing

Context: SecuraMem is free/open‑source and runs fully local with zero‑egress by default. The tools above are primarily coding assistants/IDEs with cloud inference by default; some provide private or on‑prem options at higher tiers.

# SecuraMem vs. Air-Gapped Alternatives
SecuraMem is designed for regulated, air-gapped, and compliance-driven environments. It provides:
- Air-Gapped Context (.smemctx) export/import
  - CLI: smem index-code, smem search-code, smem replay, smem receipt-show

