# Security

SecuraMem is local-only by design: no telemetry and no network egress by default. You can prove it at runtime.

- Offline by default: policy.networkEgress=false and a runtime guard block http/https.
- Transparency: every command writes a local JSON receipt; see docs/receipts.md.
- Air-gapped context: `.smemctx` export/import with optional ED25519 signing (legacy `.agmctx` imports still work).
- Verify offline posture any time:

```powershell
smem prove-offline --json
```
