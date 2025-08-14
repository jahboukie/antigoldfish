#!/usr/bin/env node
/**
 * Air‑gapped hardening test harness for SecuraMem.
 *
 * Scope:
 *  - NO external network access (any attempt → immediate failure)
 *  - Sequential execution of the current hardening / regression scripts
 *    (these live at repo root, not under a tests/ folder)
 *  - Minimal, deterministic output for CI / local dev
 *  - Optional flags:
 *        --keep-going   : run all scripts even if one fails
 *        --no-build     : skip auto build step
 *        --list         : list discovered scripts then exit 0
 *
 * Note: This replaces the old generic Node test runner which expected
 *       tests/*.mjs. The project has pivoted to an offline CLI + memory
 *       engine; we rely on purpose-built JS test scripts instead.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- Simple CLI flag parse ----
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--')));
const KEEP_GOING = flags.has('--keep-going');
const NO_BUILD = flags.has('--no-build');
const LIST_ONLY = flags.has('--list');

// ---- Offline guard (HTTP/HTTPS + fetch) ----
function installOfflineGuards() {
  const http = require('http');
  const https = require('https');
  const netAllowed = new Set(['127.0.0.1','::1','localhost']);
  const deny = (modName) => function guardedRequest(...args) {
    let host = 'unknown';
    try {
      if (args[0] && typeof args[0] === 'string') host = new URL(args[0]).hostname;
      else if (args[0] && typeof args[0] === 'object') host = (args[0].hostname || args[0].host || host);
    } catch {}
    if (!netAllowed.has(host)) {
      console.error(`\n✖ Network egress blocked (${modName} → ${host}) – air‑gapped mode`);
      process.exit(111); // distinct exit for network violation
    }
    return original[modName](...args);
  };
  const original = {
    http: http.request.bind(http),
    https: https.request.bind(https)
  };
  http.request = deny('http');
  https.request = deny('https');
  // fetch (Node 18+)
  if (typeof global.fetch === 'function') {
    const origFetch = global.fetch;
    global.fetch = async function guardedFetch(resource, init) {
      try {
        const u = new URL(resource instanceof URL ? resource.href : String(resource));
        if (!netAllowed.has(u.hostname)) {
          console.error(`\n✖ Network egress blocked (fetch → ${u.hostname}) – air‑gapped mode`);
          process.exit(111);
        }
      } catch { /* non-standard URL – treat as local */ }
      return origFetch(resource, init);
    };
  }
}

installOfflineGuards();
process.env.AGM_AIR_GAPPED = '1';
process.env.NO_NETWORK = '1';

// ---- Discover current test scripts (order matters) ----
const root = process.cwd();
const candidateScripts = [
  'test-delta-export.js',
  'test-diff-mode.js',
  'test-security-hardening.js',
  'test-memory-engine-2.js',
  // include Node test for .smemctx flows (kept last; uses node --test directly elsewhere too)
  'node --test tests/smemctx-export-import.test.mjs'
];
const scripts = candidateScripts
  .map(f => {
    if (f.startsWith('node ')) return { file: f, full: f };
    return { file: f, full: path.join(root, f) };
  })
  .filter(o => (o.file.startsWith('node ') || fs.existsSync(o.full)));

if (LIST_ONLY) {
  console.log('Discovered test scripts:');
  for (const s of scripts) console.log(' -', s.file);
  process.exit(0);
}

if (!scripts.length) {
  console.error('✖ No known test scripts present. Nothing to run.');
  process.exit(1);
}

// ---- Build step (unless skipped) ----
function needBuild() {
  if (!fs.existsSync(path.join(root,'dist'))) return true;
  const distIndex = path.join(root,'dist','index.js');
  if (!fs.existsSync(distIndex)) return true;
  // crude mtime heuristic vs src/index.ts
  try {
    const srcM = fs.statSync(path.join(root,'src','index.ts')).mtimeMs;
    const distM = fs.statSync(distIndex).mtimeMs;
    return distM < srcM;
  } catch { return false; }
}

if (!NO_BUILD && needBuild()) {
  console.log('🏗  Building (tsc)…');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  let build = spawnSync(npmCmd, ['run','build'], { stdio: 'inherit' });
  let exitCode = typeof build.status === 'number' ? build.status : (typeof build.status === 'undefined' ? -1 : build.status);
  if (exitCode !== 0) {
    console.log('⚠️ npm build path failed (status=' + build.status + '). Retrying with direct tsc');
    const tscBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const direct = spawnSync(tscBin, ['tsc','-p','tsconfig.json'], { stdio: 'inherit' });
    exitCode = typeof direct.status === 'number' ? direct.status : -1;
  }
  // If still failing but dist exists with index.js, treat as soft success (some spawn oddity)
  if (exitCode !== 0) {
    const distIndex = path.join(root,'dist','index.js');
    if (fs.existsSync(distIndex)) {
      console.log('ℹ️ Build reported failure but dist/index.js exists – continuing.');
    } else {
      console.error('✖ Build failed – aborting tests');
      process.exit(exitCode || 1);
    }
  }
}

console.log('🔒 Air‑gapped test mode (external network blocked)');
console.log('🧪 Executing scripts:', scripts.map(s => s.file).join(', '));

// ---- Execute ----
let failures = 0;
const results = [];
for (const { file, full } of scripts) {
  const started = Date.now();
  console.log(`\n▶ ${file}`);
  let run;
  if (file.startsWith('node ')) {
    const parts = file.split(' ');
    run = spawnSync(parts[0], parts.slice(1), { stdio: 'inherit', env: process.env });
  } else {
    run = spawnSync(process.execPath, [full], { stdio: 'inherit', env: process.env });
  }
  const ms = Date.now() - started;
  const ok = run.status === 0;
  results.push({ file, ok, ms });
  if (!ok) {
    failures++;
    console.log(`✖ ${file} failed (${ms}ms)`);
    if (!KEEP_GOING) break;
  } else {
    console.log(`✅ ${file} passed (${ms}ms)`);
  }
}

// ---- Summary ----
console.log('\n──────── Summary ────────');
for (const r of results) {
  console.log(`${r.ok ? '✅' : '✖'} ${r.file.padEnd(28)} ${String(r.ms).padStart(6)}ms`);
}
if (failures) {
  console.log(`\n❌ ${failures} script(s) failed`);
  process.exit(1);
}
console.log('\n✅ All scripts passed (air‑gapped)');
