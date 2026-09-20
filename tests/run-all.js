'use strict';

// Runs every tests/*.test.js file (Tasks 2-16's unit/integration tests) and reports a
// single pass/fail summary. Per PLAN.md Task 21: run before starting Task 22 and again
// before calling the game done. Usage: node tests/run-all.js

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const testsDir = __dirname;
const files = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

if (files.length === 0) {
  console.error('No *.test.js files found in ' + testsDir);
  process.exit(1);
}

const results = [];

for (const file of files) {
  const fullPath = path.join(testsDir, file);
  const result = spawnSync(process.execPath, [fullPath], { encoding: 'utf8' });
  const passed = result.status === 0;
  results.push({ file, passed, stdout: result.stdout, stderr: result.stderr });
}

console.log('');
for (const r of results) {
  console.log((r.passed ? 'PASS' : 'FAIL') + '  ' + r.file);
  if (!r.passed) {
    if (r.stdout) console.log(r.stdout.trim());
    if (r.stderr) console.log(r.stderr.trim());
  }
}

const failed = results.filter((r) => !r.passed);
console.log('');
console.log(results.length - failed.length + '/' + results.length + ' test files passed.');

if (failed.length > 0) {
  console.log('FAILED: ' + failed.map((r) => r.file).join(', '));
  process.exit(1);
}

console.log('All test files passed.');
process.exit(0);
