# Troubleshooting

## Windows PowerShell quirks
- Prefer direct commands like `node dist/cli.js status` in tasks. Avoid complex `node -e` inline scripts.
- If a task shows `Command execution blocked by policy: --help` once, re-run; help/version are bypassed and whitelisted. Reloading VS Code clears stale task state.

## SQLite/better-sqlite3
- If native module fails to load, run the helper:
```powershell
npm run fix-sqlite
```
- Ensure Node.js version matches the prebuilt bindings in your environment.

## Policy blocks
- Use the doctor:
```powershell
smem policy doctor --cmd index-code --path .
```
- Then allow the suggested command/path:
```powershell
smem policy allow-command index-code
smem policy allow-path ./**
```

## Decrypt/encrypt cycles
- If you see "Failed to decrypt database" or "integrity check failed", reinitialize local artifacts:
```powershell
smem init --force
```
- This deletes only the local `.securamem/memory.db(.enc/.temp)` files (legacy `.antigoldfishmode/` still read-compatible) and recreates a fresh DB; future closes will re‑encrypt automatically.

## Vectors
- Hybrid search relies on optional embeddings. If initialization fails, SecuraMem falls back to FTS-only; searches still work.
