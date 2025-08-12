import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';

function run(args, opts={}) {
  const res = spawnSync('node', ['dist/cli.js', ...args], { encoding: 'utf8', ...opts });
  return res;
}

test('CLI --help bypasses policy and exits 0', async () => {
  const res = run(['--help']);
  assert.equal(res.status, 0, `help exit: ${res.status}\n${res.stderr}`);
  assert.match(res.stdout, /AntiGoldfishMode|AGM/i);
});

test('CLI --version prints version and exits 0', async () => {
  const res = run(['--version']);
  assert.equal(res.status, 0, `version exit: ${res.status}\n${res.stderr}`);
  assert.match(res.stdout.trim(), /\d+\.\d+\.\d+/);
});
