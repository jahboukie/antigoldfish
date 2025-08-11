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
