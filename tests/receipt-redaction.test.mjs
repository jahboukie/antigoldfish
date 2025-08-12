import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { Tracer } from '../dist/utils/Trace.js';

// NOTE: This test imports the built dist version; ensure build ran before tests (npm test does this).

test('receipt redacts outside-root absolute paths', () => {
  const proj = process.cwd();
  const tracer = Tracer.create(proj);
  const externalPath = path.resolve('..','..','some','secret','file.txt');
  const receiptPath = tracer.writeReceipt('unit-test', { ext: externalPath }, { result: externalPath }, true);
  const rec = JSON.parse(fs.readFileSync(receiptPath,'utf8'));
  assert.equal(rec.params.ext, '<redacted:outside-root>');
  assert.equal(rec.results.result, '<redacted:outside-root>');
  assert.ok(rec.extras.redactions.outsideRoot.count >= 1);
});
