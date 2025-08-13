# Release Guide

This document describes how to produce and verify release artifacts for AntiGoldfishMode.

## 1. Build
```powershell
npm ci --ignore-scripts=false
npm run build
```

## 2. Generate SBOM (optional but recommended)
```powershell
npm run sbom
```
Produces `sbom.json` (npm dependency tree). Optionally sign this with your release key.

## 3. Create artifact bundle and checksums
```powershell
npm run release:artifacts
```
Outputs under `.artifacts/`:
- dist/** (compiled JS)
- package.json
- LICENSE (if present)
- SHA256SUMS.txt (hashes relative to artifact root)

## 4. (Optional) Sign artifacts
```powershell
npm run release:artifacts:sign
```
If `ssh-keygen -Y sign` (OpenSSH 8.2+) is available, creates detached `.sig` files beside each artifact using an ed25519 key stored at `.antigoldfishmode/keys/release_ed25519`.

## 5. Verify checksums (user side)
```powershell
Get-Content .artifacts/SHA256SUMS.txt | ForEach-Object {
  $parts = $_ -split '\s+'; if ($parts.Length -ge 2) {
    $expected = $parts[0]; $rel = ($parts[1..($parts.Length-1)] -join ' ').Trim();
    $full = Join-Path .artifacts $rel
    if (Test-Path $full) {
      $actual = (Get-FileHash -Algorithm SHA256 $full).Hash
      if ($actual -ne $expected) { Write-Host "Mismatch: $rel" -ForegroundColor Red }
    }
  }
}
```

## 6. Publish
- Commit / tag (e.g. `v1.7.0`).
- Attach `.artifacts/` contents (or archive) + `SHA256SUMS.txt` (+ signatures) to the GitHub Release.
- Include `SECURITY.md` and highlight the `prove-offline` command in the release notes.

## 7. Reproducibility
Consumers can reproduce by following `REPRODUCIBLE_BUILDS.md` and diffing their `SHA256SUMS.txt` against the published one.

## Signing Notes
- If you need multiple keys / rotation, keep additional public keys and plan trust anchors in `policy.md` (future work).
- For stronger supply‑chain guarantees consider in-toto attestations or Sigstore (out of scope for the minimal local-only model).

## Quick TL;DR
```powershell
npm ci
npm run build
npm run sbom
npm run release:artifacts:sign
# Publish .artifacts + sbom.json + SECURITY.md reference
```
