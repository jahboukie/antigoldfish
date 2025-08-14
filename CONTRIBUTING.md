# Contributing to SecuraMem (smem)

Thanks for contributing! This project is built to run fully offline; please keep changes air‑gapped and deterministic.

## Prerequisites
- Node.js >= 18 (20+ recommended)
- Git
- Windows, macOS, or Linux

## Setup
```powershell
# Clone
git clone https://github.com/SecuraMem/smem-cli.git
cd smem-cli

# Install deps
npm ci

# Optional: ensure better-sqlite3 works in your env
node scripts/ensure-sqlite.js
```

## Build
```powershell
npm run build   # compiles TypeScript to dist/
```

## Test (air‑gapped harness)
```powershell
# Full offline test harness (blocks network egress)
npm test

# Keep going even if a script fails (for local debugging)
npm run test:keep-going

# Quick smoke
npm run smoke
```

Notes:
- The harness auto-builds if needed. To skip the auto-build: `node scripts/run-tests.js --no-build`.
- Network access is denied during tests (http/https/fetch). Any attempt will fail with a distinct exit code.

### CI artifacts
- SBOM: CI uploads `sbom.json` (Ubuntu job) as an artifact per Node version.
- Checksums: CI uploads `.artifacts-ci/SHA256SUMS.txt` (Ubuntu job) for integrity verification.

## Development tips
- Typecheck only: `npm run typecheck`
- Watch build: `npm run build:watch`
- Repair sqlite bindings if needed: `npm run rebuild-sqlite` or `npm run fix-sqlite`

## Common workflows
- Index demo: `node dist/cli.js index-code --symbols --path .`
- Search: `node dist/cli.js search-code "query" --hybrid --preview 3`
- Export/import: `node dist/cli.js export-context --out ctx.smemctx` / `node dist/cli.js import-context ctx.smemctx`

## Commit & PR guidelines
- Keep changes minimal and local; prefer small PRs.
- Include a short rationale in the PR description.
- Do not add network calls or telemetry.
- Keep branding and legacy compatibility intact (.securamem primary; legacy .antigoldfishmode readable; .smemctx default; .agmctx import-compatible).

## Release process (maintainers)
- Bump version in package.json (and ensure src/index.ts version stays in sync if printed).
- Tag as `vX.Y.Z` and push; GitHub Actions will build, sign (when key provided), and attach artifacts.
- Update CHANGELOG.md and the release notes template as needed.

Questions? Open an issue or email: securamem@gmail.com
