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

test('import-context tamper yields exit 4 (checksum mismatch precedence)', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['help','--help','-h','version','--version','-V','export-context','import-context','policy'], allowedGlobs: ['**/*'], envPassthrough: ['PATH'], networkEgress: false, auditTrail: true, requireSignedContext: true, signExports: true };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode', 'policy.json'), JSON.stringify(policy, null, 2));
  const outDir = path.join(dir, 'ctx.agmctx');
  const res = run(['export-context', '--out', outDir, '--type', 'code'], dir);
  assert.equal(res.status, 0, 'export failed unexpectedly');
  const mf = path.join(outDir, 'manifest.json');
  const parsed = JSON.parse(fs.readFileSync(mf, 'utf8'));
  parsed.count = parsed.count + 1; // corrupt
  fs.writeFileSync(mf, JSON.stringify(parsed, null, 2));
  const imp = run(['import-context', outDir], dir);
  assert.equal(imp.status, 4, `expected exit 4, got ${imp.status}\n${imp.stdout}\n${imp.stderr}`);
  assert.match(imp.stdout + imp.stderr, /checksum mismatch|checksum_mismatch/i);
});
