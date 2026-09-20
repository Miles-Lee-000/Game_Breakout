'use strict';

// Plain-Node test for reflectOffBoundaries (SPEC.md §9, PLAN.md Task 8).
// No test framework — uses node:assert/strict. Run with: node tests/walls.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const { reflectOffBoundaries } = require(path.join(__dirname, '..', 'app', 'js', 'walls.js'));

const CANVAS_W = 480;
const RADIUS = 8;

// ---------------------------------------------------------------------------
// 1. Left wall: ball already slightly past the boundary, moving left — vx
//    inverts and x clamps to exactly `radius` (not wherever it was).
{
  const result = reflectOffBoundaries(RADIUS - 3, 300, -200, 50, RADIUS, CANVAS_W);
  assert.equal(result.x, RADIUS, 'left wall: x should clamp to exactly radius');
  assert.equal(result.vx, 200, 'left wall: vx should invert');
  assert.equal(result.y, 300, 'left wall: y should be unchanged');
  assert.equal(result.vy, 50, 'left wall: vy should be unchanged');
  assert.deepEqual(result.hit, ['left'], 'left wall: hit should report only left');
}

// ---------------------------------------------------------------------------
// 2. Right wall: symmetric case — ball past the right boundary, moving right —
//    vx inverts and x clamps to exactly `canvasW - radius`.
{
  const result = reflectOffBoundaries(CANVAS_W - RADIUS + 3, 300, 200, 50, RADIUS, CANVAS_W);
  assert.equal(result.x, CANVAS_W - RADIUS, 'right wall: x should clamp to exactly canvasW - radius');
  assert.equal(result.vx, -200, 'right wall: vx should invert');
  assert.equal(result.y, 300, 'right wall: y should be unchanged');
  assert.equal(result.vy, 50, 'right wall: vy should be unchanged');
  assert.deepEqual(result.hit, ['right'], 'right wall: hit should report only right');
}

// ---------------------------------------------------------------------------
// 3. Ceiling: ball slightly past the top boundary, moving up — vy inverts and
//    y clamps to exactly `radius`.
{
  const result = reflectOffBoundaries(240, RADIUS - 2, 100, -300, RADIUS, CANVAS_W);
  assert.equal(result.y, RADIUS, 'ceiling: y should clamp to exactly radius');
  assert.equal(result.vy, 300, 'ceiling: vy should invert');
  assert.equal(result.x, 240, 'ceiling: x should be unchanged');
  assert.equal(result.vx, 100, 'ceiling: vx should be unchanged');
  assert.deepEqual(result.hit, ['ceiling'], 'ceiling: hit should report only ceiling');
}

// ---------------------------------------------------------------------------
// 4. No-op case: a ball in the middle of the canvas, moving in any direction,
//    should pass through unchanged with an empty hit array.
{
  const result = reflectOffBoundaries(240, 360, -120, 90, RADIUS, CANVAS_W);
  assert.equal(result.x, 240, 'no-op: x should be unchanged');
  assert.equal(result.y, 360, 'no-op: y should be unchanged');
  assert.equal(result.vx, -120, 'no-op: vx should be unchanged');
  assert.equal(result.vy, 90, 'no-op: vy should be unchanged');
  assert.deepEqual(result.hit, [], 'no-op: hit should be empty');
}

// ---------------------------------------------------------------------------
// 5. Direction-guard case: a ball sitting exactly at x = radius but moving
//    RIGHT (away from the left wall) must NOT be reflected — this is the
//    deliberate anti-double-reflection guard from the left-wall check.
{
  const result = reflectOffBoundaries(RADIUS, 300, 150, 50, RADIUS, CANVAS_W);
  assert.equal(result.x, RADIUS, 'direction guard: x should be unchanged');
  assert.equal(result.vx, 150, 'direction guard: vx should NOT invert when moving away');
  assert.equal(result.y, 300, 'direction guard: y should be unchanged');
  assert.equal(result.vy, 50, 'direction guard: vy should be unchanged');
  assert.deepEqual(result.hit, [], 'direction guard: hit should be empty (no reflection)');
}

// ---------------------------------------------------------------------------
// 6. Corner case: left wall AND ceiling hit simultaneously — both vx and vy
//    invert, both x and y clamp, and hit lists both boundary names.
{
  const result = reflectOffBoundaries(RADIUS - 4, RADIUS - 5, -180, -220, RADIUS, CANVAS_W);
  assert.equal(result.x, RADIUS, 'corner: x should clamp to exactly radius');
  assert.equal(result.y, RADIUS, 'corner: y should clamp to exactly radius');
  assert.equal(result.vx, 180, 'corner: vx should invert');
  assert.equal(result.vy, 220, 'corner: vy should invert');
  assert.deepEqual(result.hit, ['left', 'ceiling'], 'corner: hit should list both left and ceiling');
}

console.log('PASS: walls.test.js — all reflectOffBoundaries tests passed');
console.log('  - left wall reflect + exact clamp: OK');
console.log('  - right wall reflect + exact clamp: OK');
console.log('  - ceiling reflect + exact clamp: OK');
console.log('  - no-op mid-canvas case: OK');
console.log('  - direction-guard (moving away, no double-reflect): OK');
console.log('  - corner case (left + ceiling simultaneously): OK');
process.exit(0);
