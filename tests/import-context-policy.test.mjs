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

// This test validates that requireSignedContext blocks unsigned imports,
// and that a trust token + --allow-unsigned temporarily bypasses it.

test('import-context respects requireSignedContext and allow-unsigned with trust', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });

  // Write strict policy
  const policy = {
    allowedCommands: [
      'init','status','vector-status','ai-guide','index-code','search-code','journal','replay','receipt-show','remember','recall','policy',
      'help','--help','-h','version','--version','-V','export-context','import-context'
    ],
    allowedGlobs: ['**/*'],
    envPassthrough: ['PATH'],
    networkEgress: false,
    auditTrail: true,
    requireSignedContext: true
  };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode', 'policy.json'), JSON.stringify(policy, null, 2));

  // Create a minimal unsigned .agmctx
  const ctx = path.join(dir, 'ctx.agmctx');
  fs.mkdirSync(ctx, { recursive: true });
  fs.writeFileSync(path.join(ctx, 'manifest.json'), JSON.stringify({ schemaVersion: 1, type: 'code', count: 0, createdAt: new Date().toISOString(), vectors: { dim: 0, count: 0 } }, null, 2));
  fs.writeFileSync(path.join(ctx, 'map.csv'), 'id,file,lang,line_start,line_end,symbol,type,timestamp\n');
  fs.writeFileSync(path.join(ctx, 'vectors.f32'), Buffer.alloc(0));
  fs.writeFileSync(path.join(ctx, 'notes.jsonl'), '');

  // Import should be blocked
  const blocked = run(['import-context', ctx], dir);
  assert.notEqual(blocked.status, 0, `import should be blocked. stdout=\n${blocked.stdout}\nstderr=\n${blocked.stderr}`);
  assert.match(blocked.stdout + blocked.stderr, /Import blocked: policy requires a valid signed/i);

  // Grant trust and allow unsigned
  let res = run(['policy','trust','import-context','--minutes','1'], dir);
  assert.equal(res.status, 0, 'trust grant failed');

  res = run(['import-context', ctx, '--allow-unsigned'], dir);
  assert.equal(res.status, 0, `import with allow-unsigned failed: ${res.status}\n${res.stdout}\n${res.stderr}`);
});
