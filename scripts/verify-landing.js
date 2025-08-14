#!/usr/bin/env node
// Verify landing build has expected files
const fs = require('fs-extra');
const path = require('path');

function mustExist(p) {
  if (!fs.existsSync(p)) {
    console.error('Missing:', p);
    process.exit(1);
  }
}

async function main() {
  const root = process.cwd();
  const out = path.join(root, 'dist', 'landing');
  mustExist(out);
  mustExist(path.join(out, 'index.html'));
  mustExist(path.join(out, 'sitemap.xml'));
  mustExist(path.join(out, 'robots.txt'));
  const manifest = path.join(out, 'build-manifest.json');
  mustExist(manifest);
  const data = await fs.readJSON(manifest).catch(() => ({}));
  if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
    console.error('Manifest files missing or empty');
    process.exit(1);
  }
  console.log('Landing verified:', out);
}

main().catch((e) => { console.error(e); process.exit(1); });
