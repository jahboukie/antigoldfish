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

// Tamper with exported file to trigger checksum mismatch (exit code 4 takes precedence over signature)

test('import-context detects tampering (checksum mismatch exit code 4)', async () => {
  const dir = mkTmp();
  // Create policy requiring signed context so invalid signature triggers exit 3
  fs.mkdirSync(path.join(dir, '.antigoldfishmode'), { recursive: true });
  const policy = {
    allowedCommands: ['export-context','import-context','policy','help','--help','-h','version','--version','-V'],
    allowedGlobs: ['**/*'],
    envPassthrough: ['PATH'],
    networkEgress: false,
    auditTrail: true,
    requireSignedContext: true,
    signExports: true
  };
  fs.writeFileSync(path.join(dir, '.antigoldfishmode','policy.json'), JSON.stringify(policy,null,2));
  const outDir = path.join(dir, 'ctx.agmctx');
  // export with signing on (default) first init memory
  const res1 = run(['export-context','--out', outDir, '--sign'], dir);
  assert.equal(res1.status, 0, 'export should succeed');
  const vectorsPath = path.join(outDir,'vectors.f32');
  // append a single null byte to vectors to break hash
  fs.appendFileSync(vectorsPath, Buffer.from([0]));
  const res2 = run(['import-context', outDir], dir);
  assert.equal(res2.status, 4, `tampered import should exit with code 4 (got ${res2.status})`);
  assert.match(res2.stderr + res2.stdout, /checksum mismatch|checksum_mismatch/i);
});
