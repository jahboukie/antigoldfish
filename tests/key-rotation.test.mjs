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

test('key rotate produces new keyId and export embeds keyId', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  // allow export-context and key commands
  const policy = { allowedCommands: ['export-context','key','help','--help','-h','version','--version','-V'], allowedGlobs:['**/*'], envPassthrough:['PATH'], networkEgress:false, auditTrail:true };
  fs.writeFileSync(path.join(dir,'.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  const keyStatus1 = run(['key','status'], dir); // may say no key
  const rot = run(['key','rotate'], dir);
  assert.equal(rot.status, 0, 'rotate should succeed');
  const status2 = run(['key','status'], dir);
  const m = status2.stdout.match(/keyId: (\w{16})/);
  assert.ok(m, 'keyId not printed');
  const keyId = m[1];
  const outDir = path.join(dir,'ctx.agmctx');
  const exp = run(['export-context','--out', outDir, '--sign'], dir);
  assert.equal(exp.status, 0, 'export failed');
  const manifest = JSON.parse(fs.readFileSync(path.join(outDir,'manifest.json'),'utf8'));
  assert.equal(manifest.keyId, keyId, 'manifest keyId mismatch');
});
