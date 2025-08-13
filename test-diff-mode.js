#!/usr/bin/env node
/**
 * Diff mode regression test
 * Ensures:
 *  1. Baseline symbol index populates file-digest cache
 *  2. Immediate diff run skips unchanged files (Saved chunks: 0)
 *  3. After mutating a src file, diff run stores >0 chunks for that file
 * Run with: node test-diff-mode.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd) {
  return execSync(`node dist/cli.js ${cmd}`, { stdio: 'pipe' }).toString();
}

(async function main(){
  console.log('=== Diff Mode Test ===');
  // Policy allowances (idempotent)
  try { run('policy allow-command index-code'); } catch {}
  try { run('policy allow-command reindex-file'); } catch {}
  try { run('policy allow-path "**/*"'); } catch {}

  console.log('1) Baseline full symbol index');
  const out1 = run('index-code --path src --symbols');
  if (!/Saved chunks: \d+/i.test(out1)) throw new Error('Baseline index output missing Saved chunks line');
  const m1 = out1.match(/Saved chunks: (\d+)/i); const saved1 = m1 ? parseInt(m1[1],10) : NaN;
  if (!Number.isFinite(saved1) || saved1 === 0) throw new Error('Baseline index saved count not > 0');

  console.log('2) Diff run (expect 0 new)');
  const out2 = run('index-code --path src --symbols --diff');
  if (!/Saved chunks: 0/i.test(out2)) {
    console.log(out2);
    throw new Error('Diff run did not report 0 saved chunks for unchanged set');
  }

  console.log('3) Mutate src/index.ts');
  const target = path.join(process.cwd(), 'src', 'index.ts');
  if (!fs.existsSync(target)) throw new Error('src/index.ts not found');
  fs.appendFileSync(target, `\n// DIFF TEST MUTATION ${Date.now()}\n`);

  console.log('4) Diff run after mutation (expect >0)');
  const out3 = run('index-code --path src --symbols --diff');
  const m3 = out3.match(/Saved chunks: (\d+)/i); const saved3 = m3 ? parseInt(m3[1],10) : NaN;
  if (!Number.isFinite(saved3) || saved3 <= 0) {
    console.log(out3);
    throw new Error('Diff run after mutation did not add any chunks');
  }

  console.log('✅ Diff mode test passed');
})().catch(e => { console.error(e); process.exit(1); });
