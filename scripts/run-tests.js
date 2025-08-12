#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

(function main() {
  const root = process.cwd();
  const testDir = path.join(root, 'tests');
  if (!fs.existsSync(testDir)) {
    console.error(`✖ tests directory not found: ${testDir}`);
    process.exit(1);
  }
  const files = walk(testDir).filter(f => f.endsWith('.mjs'));
  if (files.length === 0) {
    console.error('✖ No test files found (*.mjs) under tests/');
    process.exit(1);
  }
  const args = ['--test', ...files];
  const child = spawn(process.execPath, args, { stdio: 'inherit', shell: false });
  child.on('exit', code => process.exit(code ?? 1));
})();
