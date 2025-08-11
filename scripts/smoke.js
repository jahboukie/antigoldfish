#!/usr/bin/env node
const { spawnSync } = require('child_process');

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    console.error(`✖ Failed: ${cmd} ${args.join(' ')}`);
    process.exit(res.status || 1);
  }
}

console.log('🔎 AGM smoke test: help, version, status');
run('node', ['dist/cli.js', '--help']);
run('node', ['dist/cli.js', '--version']);
run('node', ['dist/cli.js', 'status']);
console.log('✅ Smoke test passed');
