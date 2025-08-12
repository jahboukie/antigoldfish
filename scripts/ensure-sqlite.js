#!/usr/bin/env node
/**
 * CI guard: ensure better-sqlite3 is loadable. If not, try an automatic rebuild.
 */
const { spawnSync } = require('child_process');

function tryRequire() {
  try {
    require('better-sqlite3');
    return true;
  } catch (e) {
    console.error('better-sqlite3 not loadable yet:', e && e.message);
    return false;
  }
}

(async () => {
  console.log('🔎 ensure-sqlite: checking better-sqlite3 availability...');
  if (tryRequire()) {
    console.log('✅ better-sqlite3 loaded successfully (no rebuild needed)');
    process.exit(0);
  }
  console.log('🔧 attempting npm rebuild better-sqlite3...');
  const res = spawnSync('npm', ['rebuild', 'better-sqlite3'], { stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error('❌ npm rebuild better-sqlite3 failed with status', res.status);
    process.exit(1);
  }
  if (tryRequire()) {
    console.log('✅ better-sqlite3 loaded after rebuild');
    process.exit(0);
  }
  console.error('❌ better-sqlite3 still not loadable after rebuild');
  process.exit(1);
})();
