# Zero-Trust Policy

AGM runs with a local, auditable policy that controls commands, file access, environment variables, and network egress.

Policy file: `.antigoldfishmode/policy.json`

Defaults include: help/version always allowed, common commands permitted, `allowedGlobs: ["**/*"]`, `networkEgress: false`, `auditTrail: true`, and encryption at rest enabled.

## Common workflows

- Show status
```powershell
agm policy status
```

- Allow a specific command
```powershell
agm policy allow-command index-code
```

- Allow a path glob
```powershell
agm policy allow-path ./**
```

- Explain why something is blocked and how to fix
```powershell
agm policy doctor --cmd search-code --path .
```

- Temporary trust for a command (dev convenience)
```powershell
agm policy trust search-code --minutes 15
```

## Air-gapped context policy toggles (.agmctx)

AGM supports portable context via `.agmctx`. Two policy toggles control signing and import verification:

- `signExports` (boolean): When true, `agm export-context` signs by default as if `--sign` was passed. You can also force signing with the flag or set the environment toggle `AGM_SIGN_EXPORT=1`.
- `requireSignedContext` (boolean): When true, `agm import-context` requires a valid signature (signature.bin/publickey.der) and blocks unsigned contexts.

Temporary bypass for unsigned import (trusted):
```powershell
agm policy trust import-context --minutes 15
agm import-context ./ctx.agmctx --allow-unsigned
```
Run `agm policy status` to view the effective values: `.agmctx defaults: signExports=…, requireSignedContext=…`.

### Precedence (signing decision)

Highest to lowest:
1. `policy.forceSignedExports=true`
2. CLI flag `--sign` / `--no-sign`
3. `policy.signExports=true`
4. `AGM_SIGN_EXPORT=1`
5. default: unsigned

## Help/version bypass
AGM never blocks `--help`, `-h`, `--version`, `-V`. The CLI also bypasses enforcement when only these flags are present. If you see a one-off block message in a task, reload VS Code to clear stale state.

## No egress proof
Use `agm prove-offline` to print an explicit no-egress proof line showing:
- policy network egress state (allowed/blocked)
- runtime egress guard state (active/inactive)
- presence of proxy environment variables

For machine-readable checks:
```powershell
agm prove-offline --json
```
This outputs `{ "offlineProof": { policyNetworkEgress, networkGuardActive, proxiesPresent, proxyVars, timestamp } }`.
You can parse and assert in scripts/CI to verify offline posture.
