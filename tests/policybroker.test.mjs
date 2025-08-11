import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Test compiled JS output to avoid TS transpile in tests; use file:// URL for Windows
const moduleUrl = pathToFileURL(path.resolve('dist/utils/PolicyBroker.js')).href;
const { PolicyBroker } = await import(moduleUrl);

function withTempDir(prefix = 'agm-test-') {
  const dir = fs.mkdtempSync(path.join(process.cwd(), prefix));
  return dir;
}

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

test('PolicyBroker creates default policy and allows help/version', async () => {
  const dir = withTempDir();
  const policyPath = path.join(dir, '.antigoldfishmode', 'policy.json');
  const broker = new PolicyBroker(policyPath);
  const pol = broker.getPolicy();
  assert.ok(Array.isArray(pol.allowedCommands));
  assert.equal(broker.isCommandAllowed('help'), true);
  assert.equal(broker.isCommandAllowed('--help'), true);
  assert.equal(broker.isCommandAllowed('version'), true);
});

test('PolicyBroker allow-command persists', async () => {
  const dir = withTempDir();
  const policyPath = path.join(dir, '.antigoldfishmode', 'policy.json');
  const broker = new PolicyBroker(policyPath);
  assert.equal(broker.isCommandAllowed('index-code'), true); // default
  const added = broker.allowCommand('custom-cmd');
  assert.equal(added, true);
  const json = readJSON(policyPath);
  assert.ok(json.allowedCommands.includes('custom-cmd'));
});

test('PolicyBroker path matching works for repo files', async () => {
  const dir = withTempDir();
  const policyPath = path.join(dir, '.antigoldfishmode', 'policy.json');
  const broker = new PolicyBroker(policyPath);
  // default allowedGlobs ["**/*"] should allow any file
  const someFile = path.join(dir, 'src', 'index.ts');
  fs.mkdirSync(path.dirname(someFile), { recursive: true });
  fs.writeFileSync(someFile, '');
  assert.equal(broker.isFileAllowed(someFile), true);
});
