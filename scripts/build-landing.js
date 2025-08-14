#!/usr/bin/env node
// Simple landing builder: copies public/ to dist/landing
const fs = require('fs-extra');
const path = require('path');

async function main() {
  const root = process.cwd();
  const src = path.join(root, 'public');
  const out = path.join(root, 'dist', 'landing');
  if (!fs.existsSync(src)) {
    console.error('public/ folder not found');
    process.exit(1);
  }
  await fs.ensureDir(out);
  await fs.emptyDir(out);
  await fs.copy(src, out, { overwrite: true, errorOnExist: false });
  // Write a tiny build manifest
  const files = await fs.readdir(out);
  await fs.writeJSON(path.join(out, 'build-manifest.json'), {
    generatedAt: new Date().toISOString(),
    files
  }, { spaces: 2 });
  console.log('Landing build complete →', path.relative(root, out));
}

main().catch((e) => { console.error(e); process.exit(1); });
