'use strict';

// Integration test for SPEC §9's canonical per-collision pipeline: reflect (at V_pre)
// -> guard (direction only) -> rescale to V_post (bricks only). Verifies the three
// pure modules compose correctly as one ordered pipeline, not just each in isolation.

const assert = require('node:assert/strict');
const { resolveBrickCollision } = require('../app/js/brick-collision.js');
const { enforceAngleGuard } = require('../app/js/angle-guard.js');
const { currentLevelSpeed } = require('../app/js/speed.js');

function rescaleToSpeed(vx, vy, speed) {
  const mag = Math.hypot(vx, vy);
  const scale = speed / mag;
  return { vx: vx * scale, vy: vy * scale };
}

// A brick-hit fixture: ball approaching a brick's top face, at V_pre = 300, landing
// dead-center-ish so the reflection alone would leave vx effectively unrotated (a
// vertical approach mostly preserves vx) -- we pick an input that will actually need
// the guard's clamp, to make sure the pipeline really exercises all 3 steps.
const brick = { x: 100, y: 100, width: 60, height: 20 };
const V_PRE = 300;
const ballX = 130; // horizontally centered on the brick -> vertical approach
const ballY = 97; // just above the brick's top face
const vxPre = 0; // straight down -- exercises the same vx===0 tie-break as the paddle case
const vyPre = V_PRE;

const level = 0;
let bricksClearedThisLevel = 4; // pretend 4 bricks were already cleared before this hit

// Step 1: reflect at V_pre.
const reflected = resolveBrickCollision(ballX, ballY, 8, vxPre, vyPre, brick);
assert.ok(Math.abs(Math.hypot(reflected.vx, reflected.vy) - V_PRE) < 1e-9, 'reflection should preserve V_pre');

// Step 2: guard (direction only, still at V_pre).
const guarded = enforceAngleGuard(reflected.vx, reflected.vy);
assert.ok(Math.abs(Math.hypot(guarded.vx, guarded.vy) - V_PRE) < 1e-9, 'guard should preserve V_pre (direction-only step)');
assert.ok(guarded.vx !== 0, 'guard should have deflected the vx===0 case (same tie-break as the paddle regression)');

// Step 3: rescale to V_post using the POST-increment bricksClearedThisLevel.
bricksClearedThisLevel += 1;
const vPost = currentLevelSpeed(level, bricksClearedThisLevel);
const final = rescaleToSpeed(guarded.vx, guarded.vy, vPost);

// Direction must match the guarded output's direction exactly (same unit vector).
const guardedUnit = { x: guarded.vx / V_PRE, y: guarded.vy / V_PRE };
const finalUnit = { x: final.vx / vPost, y: final.vy / vPost };
assert.ok(Math.abs(guardedUnit.x - finalUnit.x) < 1e-9, 'final direction (x) should match the guarded direction');
assert.ok(Math.abs(guardedUnit.y - finalUnit.y) < 1e-9, 'final direction (y) should match the guarded direction');

// Magnitude must equal exactly the post-increment currentLevelSpeed(), not V_pre.
assert.ok(Math.abs(Math.hypot(final.vx, final.vy) - vPost) < 1e-9, 'final magnitude should equal currentLevelSpeed() post-increment');
assert.notEqual(vPost, V_PRE, 'sanity: this fixture should actually change speed, to prove rescale is doing something');

console.log('PASS: pipeline.test.js (reflect -> guard -> rescale composes correctly as one ordered pipeline)');
