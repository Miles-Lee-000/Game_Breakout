'use strict';

const assert = require('node:assert/strict');
const { currentLevelSpeed } = require('../app/js/speed.js');

const LEVEL_BASE_SPEEDS = [300, 330, 360];
const SPEED_PER_BRICK = 0.02;
const SPEED_CAP_MULT = 1.5;

for (let level = 0; level < 3; level++) {
  const base = LEVEL_BASE_SPEEDS[level];

  // At 0 bricks cleared: exactly the base speed.
  assert.equal(currentLevelSpeed(level, 0), base, `level ${level}: speed at 0 bricks should equal base`);

  // At a mid-value: matches the formula exactly.
  const mid = 5;
  const expectedMid = base * Math.min(1 + SPEED_PER_BRICK * mid, SPEED_CAP_MULT);
  assert.equal(currentLevelSpeed(level, mid), expectedMid, `level ${level}: speed at ${mid} bricks mismatch`);

  // Cap holds even for counts far beyond a level's total brick count.
  assert.equal(currentLevelSpeed(level, 1000), base * SPEED_CAP_MULT, `level ${level}: speed should cap at base*1.5`);
  assert.ok(currentLevelSpeed(level, 1000) <= base * SPEED_CAP_MULT + 1e-9, `level ${level}: speed should never exceed base*1.5`);
}

// Sanity: level 3's max speed matches SPEC's stated value (540 px/s).
assert.equal(currentLevelSpeed(2, 1000), 360 * 1.5);
assert.equal(currentLevelSpeed(2, 1000), 540);

console.log('PASS: speed.test.js (base at 0 bricks, exact mid-value formula, cap holds for all 3 levels)');
