import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function mkTmp() { return fs.mkdtempSync(path.join(process.cwd(), 'agm-test-')); }

function run(args, cwd) {
  const cli = path.resolve('dist/cli.js');
  return spawnSync('node', [cli, ...args], { cwd, encoding: 'utf8' });
}

test('policy doctor explains and suggests fixes', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  // Deliberately restrict policy
  const policy = {
    allowedCommands: ['help','--help','-h','version','--version','-V','policy'],
    allowedGlobs: [],
    envPassthrough: [],
    networkEgress: false,
    auditTrail: false
  };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode', 'policy.json'), JSON.stringify(policy, null, 2));

  const res = run(['policy','doctor','--cmd','index-code','--path','.'], dir);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Command check/i);
  assert.match(res.stdout, /ALLOWED|BLOCKED/i);
  assert.match(res.stdout, /Path check/i);
});
