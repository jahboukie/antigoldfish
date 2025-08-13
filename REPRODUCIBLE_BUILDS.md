# Reproducible Builds

This package aims to be reproducible given the same inputs.

Inputs
- Node.js: use the exact major.minor.patch (see .nvmrc or engines in package.json)
- OS/Arch: build on the same platform for byte-for-byte outputs
- Lockfile: npm ci with the committed package-lock.json
- Flags: `npm ci --ignore-scripts=false` then `npm run build` (no extra flags)

Steps
```powershell
# Freeze deps and build
npm ci --ignore-scripts=false
npm run build

# Record environment
node -v > BUILD-ENV.txt
npm -v >> BUILD-ENV.txt

# Generate checksums (dist/ and scripts/)
powershell -NoProfile -Command "Get-ChildItem dist -Recurse | Get-FileHash -Algorithm SHA256 | ForEach-Object { \"$($_.Hash)  $($_.Path)\" } | Set-Content SHA256SUMS.txt"
```

Notes
- better-sqlite3 is native; CI uses a guard to avoid flaky rebuilds. For strict reproducibility, prebuild on target OS/Arch or vendor the binaries.
- Dynamic timestamps in receipts are runtime artifacts and are not part of the build outputs.
