#!/usr/bin/env node
/**
 * Local-only lean test runner: focuses on core offline capabilities.
 * Included tests:
 *  1. Build (tsc)
 *  2. Delta export test (test-delta-export.js)
 *  3. Diff mode test (test-diff-mode.js)
 *  4. MemoryEngine2 smoke (optional; skipped if dist/MemoryEngine2.js absent)
 * Excludes: security hardening, licensing, any cloud/demo features.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(label, cmd) {
  process.stdout.write(`\n▶ ${label}\n`);
  return execSync(cmd, { stdio: 'inherit' });
}

(async function main(){
  const results = [];
  try {
    run('build', 'npm run build'); results.push({ name: 'build', ok: true });
    run('delta-export', 'node test-delta-export.js'); results.push({ name: 'delta-export', ok: true });
    run('diff-mode', 'node test-diff-mode.js'); results.push({ name: 'diff-mode', ok: true });
    if (fs.existsSync(path.join(process.cwd(), 'dist', 'MemoryEngine2.js'))) {
      try { run('memory-engine-2', 'node test-memory-engine-2.js'); results.push({ name: 'memory-engine-2', ok: true }); }
      catch (e) { results.push({ name: 'memory-engine-2', ok: false, error: e.message }); throw e; }
    } else {
      results.push({ name: 'memory-engine-2', ok: true, skipped: true, reason: 'not built' });
    }
    console.log('\n✅ Local test suite passed');
  } catch (e) {
    console.error('\n❌ Local test suite failed');
    process.exitCode = 1;
  } finally {
    try {
      const summaryPath = path.join(process.cwd(), '.antigoldfishmode', 'test-summary-local.json');
      fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
      fs.writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), results, allPassed: results.every(r=>r.ok) }, null, 2));
      console.log(`📝 Wrote local test summary to ${summaryPath}`);
    } catch {}
  }
})();
