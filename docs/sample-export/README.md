# Sample Export Bundle

This directory provides a minimal illustrative `.agmctx` export bundle so reviewers can inspect the structure *without* needing to generate one locally.

Files included:
- `manifest.json` – schema, exporter provenance (anonymised), counts.
- `map.csv` – a couple of synthetic rows.
- `vectors.f32` – tiny (two 4-dim float32 vectors) binary example.
- `notes.jsonl` – placeholder (empty line or example note entries).
- `checksums.json` – SHA256 digests for included assets (values here are dummy and clearly marked).

Security note: Real bundles will contain cryptographically accurate checksums and (optionally) signature/public key files. Here we deliberately use placeholder digests so no one confuses this with a live signed artifact.

To generate a real bundle locally:
```
agm export-context --out ./ctx.agmctx --type code --zip --sign
```
Then inspect receipts:
```
agm receipt-show --last
```
