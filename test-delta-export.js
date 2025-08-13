#!/usr/bin/env node
/**
 * Minimal delta export test
 * Run with: node test-delta-export.js
 */
const fs = require('fs');
const path = require('path');

async function run() {
  const { execSync } = require('child_process');
  const cli = p => execSync(`node dist/cli.js ${p}`, { stdio: 'pipe' }).toString();

  const baseDir = path.join(process.cwd(), '.antigoldfishmode');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  console.log('1) Full export');
  cli('export-context --out .antigoldfishmode/delta-base.agmctx --type code');
  const baseManifest = JSON.parse(fs.readFileSync('.antigoldfishmode/delta-base.agmctx/manifest.json','utf8'));
  const originalCount = baseManifest.count;

  console.log('2) Delta export (expect 0 exported)');
  cli('export-context --out .antigoldfishmode/delta-empty.agmctx --type code --delta-from .antigoldfishmode/delta-base.agmctx');
  const deltaManifest1 = JSON.parse(fs.readFileSync('.antigoldfishmode/delta-empty.agmctx/manifest.json','utf8'));
  if (!deltaManifest1.delta || deltaManifest1.delta.exportedCount !== 0 || deltaManifest1.delta.unchangedSkipped !== originalCount) {
    throw new Error('Delta export 1 did not skip all unchanged chunks');
  }

  console.log('3) Mutate a code file to create one new chunk');
  const probeFile = path.join(process.cwd(), 'README.md');
  fs.appendFileSync(probeFile, '\n<!-- delta test mutation -->\n');

  console.log('4) Reindex mutated file');
  cli('reindex-file README.md --symbols');
  console.log('5) Delta export after mutation');
  cli('export-context --out .antigoldfishmode/delta-changed.agmctx --type code --delta-from .antigoldfishmode/delta-base.agmctx');
  const deltaManifest2 = JSON.parse(fs.readFileSync('.antigoldfishmode/delta-changed.agmctx/manifest.json','utf8'));
  if (!deltaManifest2.delta) {
    throw new Error('Delta export 2 missing delta block');
  }
  if (deltaManifest2.delta.originalCount < originalCount) {
    throw new Error('Delta export 2 originalCount unexpectedly smaller');
  }
  if (deltaManifest2.delta.exportedCount < 0) {
    throw new Error('Delta export 2 exportedCount invalid');
  }
  if (deltaManifest2.delta.unchangedSkipped + deltaManifest2.delta.exportedCount !== deltaManifest2.delta.originalCount) {
    throw new Error('Delta export 2 counts do not sum correctly');
  }
  console.log('✅ Delta export test passed');
}

run().catch(e => { console.error(e); process.exit(1); });
