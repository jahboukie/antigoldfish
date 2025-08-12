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

test('forceSignedExports overrides --no-sign flag', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['help','--help','-h','version','--version','-V','export-context','import-context','policy'], allowedGlobs: ['**/*'], envPassthrough: ['PATH'], networkEgress: false, auditTrail: true, forceSignedExports: true, signExports: false };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode', 'policy.json'), JSON.stringify(policy, null, 2));
  const outDir = path.join(dir, 'ctx.agmctx');
  const res = run(['export-context', '--out', outDir, '--type', 'code', '--no-sign'], dir);
  assert.equal(res.status, 0, 'export failed');
  const sig = path.join(outDir, 'signature.bin');
  assert.ok(fs.existsSync(sig), 'signature.bin missing despite forceSignedExports');
});
