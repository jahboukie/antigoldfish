# Zero-Trust Policy

SecuraMem runs with a local, auditable policy that controls commands, file access, environment variables, and network egress.

Policy file: `.securamem/policy.json` (legacy `.antigoldfishmode/policy.json` still read-compatible)

Defaults include: help/version always allowed, common commands permitted, `allowedGlobs: ["**/*"]`, `networkEgress: false`, `auditTrail: true`, and encryption at rest enabled.

## Common workflows

- Show status
```powershell
smem policy status
```

- Allow a specific command
```powershell
smem policy allow-command index-code
```

- Allow a path glob
```powershell
smem policy allow-path ./**
```

- Explain why something is blocked and how to fix
```powershell
smem policy doctor --cmd search-code --path .
```

- Temporary trust for a command (dev convenience)
```powershell
smem policy trust search-code --minutes 15
```

## Air-gapped context policy toggles (.smemctx)

SecuraMem supports portable context via `.smemctx`. Two policy toggles control signing and import verification (legacy `.agmctx` imports are still accepted):

- `signExports` (boolean): When true, `smem export-context` signs by default as if `--sign` was passed. You can also force signing with the flag or set the environment toggle `SMEM_SIGN_EXPORT=1` (legacy `AGM_SIGN_EXPORT=1` also honored).
- `requireSignedContext` (boolean): When true, `smem import-context` requires a valid signature (signature.bin/publickey.der) and blocks unsigned contexts.

Temporary bypass for unsigned import (trusted):
```powershell
smem policy trust import-context --minutes 15
smem import-context ./ctx.smemctx --allow-unsigned
```
Run `smem policy status` to view the effective values: `.smemctx defaults: signExports=…, requireSignedContext=…`.

### Precedence (signing decision)

Highest to lowest:
1. `policy.forceSignedExports=true`
2. CLI flag `--sign` / `--no-sign`
3. `policy.signExports=true`
4. `AGM_SIGN_EXPORT=1`
5. default: unsigned

## Help/version bypass
SecuraMem never blocks `--help`, `-h`, `--version`, `-V`. The CLI also bypasses enforcement when only these flags are present. If you see a one-off block message in a task, reload VS Code to clear stale state.

## No egress proof
Use `smem prove-offline` to print an explicit no-egress proof line showing:
- policy network egress state (allowed/blocked)
- runtime egress guard state (active/inactive)
- presence of proxy environment variables

For machine-readable checks:
```powershell
smem prove-offline --json
```
This outputs `{ "offlineProof": { policyNetworkEgress, networkGuardActive, proxiesPresent, proxyVars, timestamp } }`.
You can parse and assert in scripts/CI to verify offline posture.
