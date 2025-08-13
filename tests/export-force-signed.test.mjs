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

// Policy forceSignedExports should override --no-sign

test('export-context forceSignedExports overrides --no-sign', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = {
    allowedCommands: [ 'export-context','init','status','vector-status','ai-guide','index-code','search-code','journal','replay','receipt-show','remember','recall','policy','help','--help','-h','version','--version','-V' ],
    allowedGlobs: ['**/*'],
    envPassthrough: ['PATH'],
    networkEgress: false,
    auditTrail: true,
    forceSignedExports: true
  };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  const outDir = path.join(dir, 'ctx.agmctx');
  const res = run(['export-context','--out', outDir, '--no-sign'], dir);
  assert.equal(res.status, 0, 'export should succeed');
  const sig = path.join(outDir,'signature.bin');
  const pub = path.join(outDir,'publickey.der');
  assert.ok(fs.existsSync(sig), 'signature.bin missing');
  assert.ok(fs.existsSync(pub), 'publickey.der missing');
  assert.match(res.stdout, /Exported .* memories/);
});
