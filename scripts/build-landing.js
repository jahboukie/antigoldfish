#!/usr/bin/env node
/**
 * build-landing.js
 * Rewrites landing-page.html injecting package version and outputs:
 *  - dist/landing.html (full readable)
 *  - dist/landing.min.html (minified, comments + excess whitespace removed)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const srcPath = path.join(root, 'landing-page.html');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'public');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

let html = fs.readFileSync(srcPath, 'utf8');
html = html.replace(/v__VERSION__/g, 'v' + pkg.version);
fs.writeFileSync(path.join(distDir, 'landing.html'), html, 'utf8');

// naive minify: remove newlines > collapse spaces, strip leading spaces, remove comments <!-- -->
let min = html
  .replace(/<!--[^!][\s\S]*?-->/g, '')
  .replace(/\n+/g, '\n')
  .replace(/>\s+</g, '><')
  .replace(/\s{2,}/g, ' ')
  .trim();
const minPath = path.join(distDir, 'landing.min.html');
fs.writeFileSync(minPath, min, 'utf8');

// also sync to public/index.html (deployment target)
const publicIndex = path.join(publicDir, 'index.html');
fs.writeFileSync(publicIndex, min + '\n', 'utf8');

console.log('[landing] injected version', pkg.version, '-> dist/landing.html, dist/landing.min.html, public/index.html');
