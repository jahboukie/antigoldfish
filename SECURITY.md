# Security

No telemetry. No network egress. prove-offline verifies at runtime.

- Offline by default: policy.networkEgress=false and a runtime guard block http/https.
- Transparency: every command writes a local JSON receipt; see docs/receipts.md.
- Air-gapped context: `.agmctx` export/import with optional ED25519 signing.
- Verify offline posture any time:

```powershell
agm prove-offline --json
```
