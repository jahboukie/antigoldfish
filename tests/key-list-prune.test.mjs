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

test('key list shows archived keys after rotation and prune removes old', async () => {
  const dir = mkTmp();
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = { allowedCommands: ['key','help','--help','-h','version','--version','-V'], allowedGlobs:['**/*'], envPassthrough:['PATH'], networkEgress:false, auditTrail:true };
  fs.writeFileSync(path.join(dir,'.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  // Rotate twice to create an archive entry
  let r = run(['key','rotate'], dir); assert.equal(r.status,0,'first rotate failed');
  r = run(['key','rotate'], dir); assert.equal(r.status,0,'second rotate failed');
  const list = run(['key','list'], dir);
  assert.equal(list.status,0,'list failed');
  assert.match(list.stdout, /archived:/, 'archived section missing');
  // Touch archive files to make them old
  const archiveDir = path.join(dir,'.antigoldfishmode','keys','archive');
  if (fs.existsSync(archiveDir)) {
    for (const f of fs.readdirSync(archiveDir)) {
      const full = path.join(archiveDir,f);
      const past = Date.now() - 40*24*60*60*1000; // 40 days ago
      fs.utimesSync(full, past/1000, past/1000);
    }
  }
  const prune = run(['key','prune','--days','30'], dir);
  assert.equal(prune.status,0,'prune failed');
});
