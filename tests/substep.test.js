'use strict';

// Plain-Node test for computeSubstepCount (SPEC.md §9, PLAN.md Task 16 — pure-math
// portion only: the substep-count formula. dt clamping is app/js/dt.js's clampDt,
// owned by Task 3 — see tests/dt.test.js).
// No test framework — uses node:assert/strict. Run with: node tests/substep.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const { computeSubstepCount } = require(path.join(__dirname, '..', 'app', 'js', 'substep.js'));

const MAX_DT = 0.05;
const BALL_RADIUS = 8;

// ---------------------------------------------------------------------------
// computeSubstepCount

// Slow case: |v|*dt <= radius, so no splitting is needed — one substep covers the
// whole frame. 300 * 0.016 = 4.8 <= 8.
function testSubstepCountSlowCaseReturnsOne() {
  assert.equal(computeSubstepCount(300, 0.016, BALL_RADIUS), 1);
}

// Fast case at SPEC's level-3 max speed (base 360 * SPEED_CAP_MULT 1.5 = 540 px/s)
// with dt already clamped to MAX_DT: 540*0.05 = 27, 27/8 = 3.375, ceil -> 4.
// This matches SPEC §9's own claim of "at most ... ≈ 4 substeps at level 3's max speed".
function testSubstepCountLevel3MaxSpeed() {
  const speed = 540; // SPEED_CAP_MULT (1.5) * level-3 base speed (360)
  const dt = MAX_DT;
  const n = computeSubstepCount(speed, dt, BALL_RADIUS);
  assert.equal(speed * dt, 27);
  assert.equal(n, 4);
}

// Boundary case: |v|*dt EXACTLY equals radius. Per SPEC's "if |v|*dt exceeds
// BALL_RADIUS" wording, an exact match does not count as exceeding, so this must
// return 1, not 2. 400 * 0.02 = 8 = radius.
function testSubstepCountExactBoundaryDoesNotSplit() {
  assert.equal(computeSubstepCount(400, 0.02, BALL_RADIUS), 1);
}

// Additional cases verifying ceil() rounds any nonzero remainder up to the next
// whole substep.
function testSubstepCountCeilRounding() {
  // 300 * 0.05 = 15, 15/8 = 1.875 -> ceil -> 2
  assert.equal(computeSubstepCount(300, 0.05, BALL_RADIUS), 2);

  // 450 * 0.05 = 22.5, 22.5/8 = 2.8125 -> ceil -> 3
  assert.equal(computeSubstepCount(450, 0.05, BALL_RADIUS), 3);
}

testSubstepCountSlowCaseReturnsOne();
testSubstepCountLevel3MaxSpeed();
testSubstepCountExactBoundaryDoesNotSplit();
testSubstepCountCeilRounding();

console.log('PASS: substep.test.js — all computeSubstepCount tests passed');
console.log('  - computeSubstepCount: slow case (no split) -> 1: OK');
console.log('  - computeSubstepCount: level-3 max speed (540 px/s) at clamped MAX_DT -> 4: OK');
console.log('  - computeSubstepCount: exact |v|*dt === radius boundary -> 1 (not 2): OK');
console.log('  - computeSubstepCount: ceil() rounding -> 2 and 3: OK');
process.exit(0);
