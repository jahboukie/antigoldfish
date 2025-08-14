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
  const dir = fs.mkdtempSync(path.join(process.cwd(), 'smem-test-'));
  return dir;
}

test('smemctx export/import round-trip (unsigned)', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.securamem'), { recursive: true });
  // permissive policy with import/export
  const policy = {
    allowedCommands: [
      'init','status','remember','recall','export-context','import-context','policy','help','--help','-h','version','--version','-V'
    ],
    allowedGlobs: ['**/*'],
    envPassthrough: ['PATH'],
    networkEgress: false,
    auditTrail: false,
    requireSignedContext: false
  };
  fs.writeFileSync(path.join(dir, '.securamem','policy.json'), JSON.stringify(policy, null, 2));

  // Seed a memory
  let r = run(['remember','hello world','--context','t','--type','note'], dir);
  assert.equal(r.status, 0, 'remember failed');

  // Export
  const outDir = path.join(dir, 'bundle.smemctx');
  r = run(['export-context','--out', outDir, '--type','code'], dir);
  assert.equal(r.status, 0, 'export-context failed');
  for (const f of ['manifest.json','map.csv','notes.jsonl','vectors.f32']) {
    assert.ok(fs.existsSync(path.join(outDir,f)), 'missing '+f);
  }

  // Import
  r = run(['import-context', outDir], dir);
  assert.equal(r.status, 0, 'import-context failed');
});

test('legacy .agmctx import still works (if present)', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['import-context','help','--help','-h','version','--version','-V'], allowedGlobs:['**/*'], envPassthrough:['PATH'], networkEgress:false, auditTrail:false };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode','policy.json'), JSON.stringify(policy, null, 2));
  const fake = path.join(dir, 'legacy.agmctx');
  fs.mkdirSync(fake, { recursive: true });
  fs.writeFileSync(path.join(fake,'manifest.json'), JSON.stringify({ schemaVersion:1, type:'code', count:0, vectors:{dim:0,count:0} }, null, 2));
  fs.writeFileSync(path.join(fake,'map.csv'), 'id,file,lang,line_start,line_end,symbol,type,timestamp,chunk_sha256\n');
  fs.writeFileSync(path.join(fake,'vectors.f32'), Buffer.alloc(0));
  const r = run(['import-context', fake], dir);
  assert.equal(r.status, 0, 'legacy import failed');
});
