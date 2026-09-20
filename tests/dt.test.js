'use strict';

const assert = require('node:assert/strict');
const { clampDt, MAX_DT } = require('../app/js/dt.js');

// Values below MAX_DT pass through unchanged.
assert.equal(clampDt(0.016), 0.016);
assert.equal(clampDt(0), 0);

// Values above MAX_DT clamp to exactly MAX_DT.
assert.equal(clampDt(1.5), MAX_DT);
assert.equal(clampDt(0.2), MAX_DT);

// A value exactly at MAX_DT passes through unchanged (not treated as "above").
assert.equal(clampDt(MAX_DT), MAX_DT);

console.log('PASS: dt.test.js (below/above/exact-boundary clamping)');
