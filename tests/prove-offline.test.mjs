import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function run(args, cwd) {
  const cli = process.platform === 'win32' ? 'node' : 'node';
  const res = spawnSync(cli, [path.resolve('dist/cli.js'), ...args], { cwd, encoding: 'utf8', shell: true });
  return { code: res.status, out: (res.stdout || '') + (res.stderr || '') };
}

test('prove-offline prints explicit proof line and JSON', async () => {
  const plain = run(['prove-offline'], process.cwd());
  assert.equal(plain.code, 0);
  assert.match(plain.out, /AGM OFFLINE PROOF: no-egress; policy=(blocked|allowed); guard=(active|inactive); proxies=(present|none)/);

  const json = run(['prove-offline','--json'], process.cwd());
  assert.equal(json.code, 0);
  assert.match(json.out, /"offlineProof"\s*:/);
});
