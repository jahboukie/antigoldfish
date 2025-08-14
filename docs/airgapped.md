# Air-Gapped Export/Import (.smemctx)

SecuraMem can export code memories to a portable `.smemctx` directory OR zipped bundle (`.smemctx.zip`).

- Export
```powershell
# Directory export
smem export-context --out ./ctx.smemctx --type code

# Zipped export (adds .zip; contents identical after extraction)
smem export-context --out ./ctx.smemctx --type code --zip

# Sign (if not enabled by policy)
smem export-context --out ./ctx.smemctx --type code --sign
```

- Verify/import (v0 is verify-only)
```powershell
smem import-context ./ctx.smemctx
smem import-context ./ctx.smemctx.zip
```

Files included (v1.8.0):
- `manifest.json` — schemaVersion, type, counts, createdAt, exporter provenance, optional keyId
- `map.csv` — id,file,lang,line_start,line_end,symbol,type,timestamp
- `vectors.f32` — contiguous float32 rows (may be empty if vectors absent)
- `notes.jsonl` — placeholder for non-code notes (currently empty)
- `checksums.json` — SHA256 per file (manifest, map.csv, vectors.f32, notes.jsonl)
- `signature.bin` + `publickey.der` — present only if signed

Backups: The live database is at `.securamem/memory.db` (encrypted/machine-bound). For raw backups, copy this file while SecuraMem is not running.

## Signing, Checksums, and Policy

- Default signing: If your project policy sets `signExports=true` (or you set `SMEM_SIGN_EXPORT=1`), `export-context` will sign by default as if `--sign` were passed. You can still pass `--sign` explicitly.
- Import verification: If your policy sets `requireSignedContext=true`, importing unsigned `.smemctx` will be blocked. To temporarily bypass, grant a short trust token and pass `--allow-unsigned`:

```powershell
smem policy trust import-context --minutes 15
smem import-context ./ctx.smemctx --allow-unsigned
```

Checksums:
- Every exported file (except signature/public key) is hashed with SHA256; `checksums.json` maps relative path -> hex digest.
- On import, checksums are verified first. If any mismatch, process exits with code 4 (checksum mismatch) BEFORE signature verification.

Signing:
- Ed25519 signatures cover the manifest + listed assets. The public key (DER) and raw signature bytes are included.
- If `requireSignedContext=true` and bundle is unsigned, import exits code 2 unless `--allow-unsigned` AND a temporary trust token is set.
- If signature verification fails (after passing checksum), exits code 3.

Exit Codes (import-context):
| Code | Meaning |
|------|---------|
| 0 | All verifications passed |
| 2 | Blocked: unsigned bundle but policy requires signing |
| 3 | Invalid signature |
| 4 | Checksum mismatch (tampered or corrupt content) |

Key Lifecycle:
- `smem key rotate` — generate new signing key; previous key archived in `keys/archive/` (manifest includes keyId)
- `smem key status` — show current active key fingerprint
- `smem key list` — list active + archived keys
- `smem key prune --days N` — remove archived keys older than N days

Provenance:
- `manifest.json` embeds exporter metadata: name, version, node version, hostname, timestamp, keyId (if signed)

Receipts: See `docs/receipts.md` for JSON shape (extras.verification includes checksum/signature status counts).
