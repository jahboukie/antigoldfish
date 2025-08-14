import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(args, cwd) {
  const cli = path.resolve('dist/cli.js');
  return spawnSync('node', [cli, ...args], { encoding: 'utf8', cwd });
}

function mkTmp() {
  const dir = fs.mkdtempSync(path.join(process.cwd(), 'agm-test-'));
  return dir;
}

test('export-context creates .smemctx directory with files', async () => {
  const dir = mkTmp();
  // Initialize project to create .securamem
  fs.mkdirSync(path.join(dir, '.securamem'), { recursive: true });
  // Allow export-context in policy
  const policy = {
    allowedCommands: [
  'init','status','vector-status','ai-guide','index-code','search-code','journal','replay','receipt-show','remember','recall','policy',
      'help','--help','-h','version','--version','-V','export-context'
    ],
    allowedGlobs: ['**/*'],
    envPassthrough: ['PATH'],
    networkEgress: false,
    auditTrail: true
  };
  fs.writeFileSync(path.join(dir, '.securamem', 'policy.json'), JSON.stringify(policy, null, 2));

  const out = path.join(dir, 'ctx.smemctx');
  const res = run(['export-context', '--out', out, '--type', 'code'], dir);
  assert.equal(res.status, 0, `export exit: ${res.status}\n${res.stdout}\n${res.stderr}`);

  // Verify files exist
  const files = ['manifest.json','map.csv','notes.jsonl','vectors.f32'];
  for (const f of files) {
    const p = path.join(out, f);
    assert.ok(fs.existsSync(p), `missing ${f}`);
  }
});
