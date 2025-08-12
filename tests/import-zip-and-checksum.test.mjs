import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(args, cwd) {
  const cli = path.resolve('dist/cli.js');
  return spawnSync('node', [cli, ...args], { encoding: 'utf8', cwd });
}

function mkTmp() { return fs.mkdtempSync(path.join(process.cwd(), 'agm-test-')); }

test('import-context handles zipped export with checksum verification', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['export-context','import-context','policy','help','--help','-h','version','--version','-V'], allowedGlobs: ['**/*'], envPassthrough: ['PATH'], networkEgress: false, auditTrail: true };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  const outZip = path.join(dir, 'ctx.agmctx.zip');
  let res = run(['export-context','--out', outZip, '--zip'], dir);
  assert.equal(res.status, 0, 'zip export should succeed');
  assert.ok(fs.existsSync(outZip), 'zip file missing');
  res = run(['import-context', outZip], dir);
  assert.equal(res.status, 0, `zip import failed: ${res.status}\n${res.stdout}\n${res.stderr}`);
});

test('import-context detects checksum mismatch (exit 4)', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['export-context','import-context','policy','help','--help','-h','version','--version','-V'], allowedGlobs: ['**/*'], envPassthrough: ['PATH'], networkEgress: false, auditTrail: true };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  const outDir = path.join(dir, 'ctx.agmctx');
  let res = run(['export-context','--out', outDir], dir);
  assert.equal(res.status, 0, 'export should succeed');
  // Corrupt map.csv to break checksum
  fs.appendFileSync(path.join(outDir,'map.csv'), '\n#tamper');
  assert.ok(fs.existsSync(path.join(outDir,'checksums.json')),'checksums.json missing');
  res = run(['import-context', outDir], dir);
  assert.equal(res.status, 4, 'checksum mismatch should exit 4');
  assert.match(res.stdout + res.stderr, /checksum mismatch|checksum_mismatch/i);
});
