import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function tmpdir(prefix = 'agm-encryption-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

test('MemoryEngine secure mode encrypts on close and decrypts on next init', async () => {
  const projectDir = tmpdir();

  // Import compiled MemoryEngine from dist
  const engineUrl = pathToFileURL(path.resolve('dist/MemoryEngine.js')).href;
  const { MemoryEngine } = await import(engineUrl);

  // Setup engine with secureMode=true and devMode=false
  const engine1 = new MemoryEngine(projectDir, true /*skipValidation*/, false /*devMode*/, true /*secureMode*/);

  // Initialize and store a memory
  await engine1.initialize();
  const id = await engine1.storeMemory('encryption test payload', 'test', 'general');
  assert.ok(id > 0, 'stored memory id should be > 0');

  // Close to trigger encryption
  await engine1.close();

  const agmDir = path.join(projectDir, '.antigoldfishmode');
  const dbPath = path.join(agmDir, 'memory.db');
  const encPath = dbPath + '.enc';

  assert.equal(fs.existsSync(dbPath), false, 'plaintext db should be removed after encryption');
  assert.equal(fs.existsSync(encPath), true, 'encrypted db should exist after close');

  // Re-open and ensure decrypt works and we can query
  const engine2 = new MemoryEngine(projectDir, true /*skipValidation*/, false /*devMode*/, true /*secureMode*/);
  await engine2.initialize();

  const results = await engine2.searchMemories('encryption');
  assert.ok(Array.isArray(results), 'search results should be an array');

  await engine2.close();
});
