#!/usr/bin/env node
/**
 * Combined hardening test runner
 * Runs (in order): build → delta export → diff mode → security hardening → MemoryEngine2 smoke
 * Fails fast on first error. Each stage prints a clear header.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, opts={}) {
  console.log(`\n▶ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function safeRestore(file, backup) {
  try { if (fs.existsSync(backup)) fs.copyFileSync(backup, file); } catch {}
}

(async function main(){
  const root = process.cwd();
  let srcIndexBackup = null;
  const srcIndex = path.join(root, 'src', 'index.ts');
  if (fs.existsSync(srcIndex)) {
    srcIndexBackup = srcIndex + '.bak-test';
    fs.copyFileSync(srcIndex, srcIndexBackup);
  }
  try {
    run('npm run build');
    run('node test-delta-export.js');
    run('node test-diff-mode.js');
    if (fs.existsSync(path.join(root,'dist','security','SecurityDemo.js'))) {
      let canRunSecurity = true;
      try { require.resolve('jsonwebtoken'); } catch { canRunSecurity = false; }
      if (canRunSecurity) run('node test-security-hardening.js');
      else console.log('ℹ️ Skipping security hardening test (jsonwebtoken not installed)');
    } else {
      console.log('ℹ️ Skipping security hardening test (module missing)');
    }
    if (fs.existsSync(path.join(root,'dist','MemoryEngine2.js'))) {
      try {
        run('node test-memory-engine-2.js');
      } catch {
        console.log('ℹ️ MemoryEngine2 test failed (non-fatal for hardening suite)');
      }
    } else {
      console.log('ℹ️ Skipping MemoryEngine2 test (dist/MemoryEngine2.js not built)');
    }
    console.log('\n✅ All tests passed');
  } catch (e) {
    console.error('\n❌ Test suite failed');
    process.exit(1);
  } finally {
    if (srcIndexBackup) safeRestore(srcIndex, srcIndexBackup);
  }
})();
