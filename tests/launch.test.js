'use strict';

const assert = require('node:assert/strict');
const { generateLaunchVelocity } = require('../app/js/launch.js');

const LAUNCH_MIN_ANGLE_DEG = 15;
const LAUNCH_MAX_ANGLE_DEG = 50;
const SPEED = 300;

function angleFromVerticalDeg(vx, vy) {
  return (Math.atan2(Math.abs(vx), Math.abs(vy)) * 180) / Math.PI;
}

// Deterministic seeded PRNG (mulberry32).
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1. Exact expected output for two fixed seeds (one giving each sign), per SPEC §11.
{
  // mulberry32(1)'s first draw determines sign; mulberry32(1)() ~ 0.6270739405881613
  // (>= 0.5 -> sign = +1). Second draw determines angle magnitude.
  const rng = mulberry32(1);
  const r1 = rng();
  const r2 = rng();
  const expectedSign = r1 < 0.5 ? -1 : 1;
  const expectedAngleDeg = expectedSign * (LAUNCH_MIN_ANGLE_DEG + r2 * (LAUNCH_MAX_ANGLE_DEG - LAUNCH_MIN_ANGLE_DEG));
  const expectedAngleRad = (expectedAngleDeg * Math.PI) / 180;
  const expectedVx = SPEED * Math.sin(expectedAngleRad);
  const expectedVy = -SPEED * Math.cos(expectedAngleRad);

  const rng2 = mulberry32(1);
  const { vx, vy } = generateLaunchVelocity(SPEED, rng2);
  assert.ok(Math.abs(vx - expectedVx) < 1e-9, `seed=1 vx mismatch: got ${vx}, expected ${expectedVx}`);
  assert.ok(Math.abs(vy - expectedVy) < 1e-9, `seed=1 vy mismatch: got ${vy}, expected ${expectedVy}`);
  assert.ok(Math.abs(Math.hypot(vx, vy) - SPEED) < 1e-9, 'seed=1 speed should equal input speed');
}

// 2. Find a seed producing the opposite sign, confirm it too matches exactly.
{
  let seed = 2;
  let foundSeed = null;
  let expectedSign2 = null;
  while (foundSeed === null) {
    const r1 = mulberry32(seed)();
    const s = r1 < 0.5 ? -1 : 1;
    if (s === -1) {
      foundSeed = seed;
      expectedSign2 = s;
    }
    seed++;
  }

  const rngProbe = mulberry32(foundSeed);
  const r1 = rngProbe();
  const r2 = rngProbe();
  const expectedAngleDeg = expectedSign2 * (LAUNCH_MIN_ANGLE_DEG + r2 * (LAUNCH_MAX_ANGLE_DEG - LAUNCH_MIN_ANGLE_DEG));
  const expectedAngleRad = (expectedAngleDeg * Math.PI) / 180;
  const expectedVx = SPEED * Math.sin(expectedAngleRad);
  const expectedVy = -SPEED * Math.cos(expectedAngleRad);

  const { vx, vy } = generateLaunchVelocity(SPEED, mulberry32(foundSeed));
  assert.ok(vx < 0, `expected a negative-sign (left) launch for seed=${foundSeed}, got vx=${vx}`);
  assert.ok(Math.abs(vx - expectedVx) < 1e-9, `seed=${foundSeed} vx mismatch`);
  assert.ok(Math.abs(vy - expectedVy) < 1e-9, `seed=${foundSeed} vy mismatch`);
  assert.ok(Math.abs(Math.hypot(vx, vy) - SPEED) < 1e-9, `seed=${foundSeed} speed should equal input speed`);
}

// 3. Across many seeds, angle from vertical always falls within [15, 50] degrees and
//    vy is always negative (upward).
{
  for (let seed = 100; seed < 200; seed++) {
    const { vx, vy } = generateLaunchVelocity(SPEED, mulberry32(seed));
    const angle = angleFromVerticalDeg(vx, vy);
    assert.ok(
      angle >= LAUNCH_MIN_ANGLE_DEG - 1e-9 && angle <= LAUNCH_MAX_ANGLE_DEG + 1e-9,
      `seed=${seed}: angle ${angle} out of [15,50] range`
    );
    assert.ok(vy < 0, `seed=${seed}: vy should be negative (upward), got ${vy}`);
    assert.ok(Math.abs(Math.hypot(vx, vy) - SPEED) < 1e-9, `seed=${seed}: speed should equal input speed`);
  }
}

// 4. Both signs actually occur across many seeds (not always the same direction).
{
  let sawPositive = false;
  let sawNegative = false;
  for (let seed = 0; seed < 50; seed++) {
    const { vx } = generateLaunchVelocity(SPEED, mulberry32(seed));
    if (vx > 0) sawPositive = true;
    if (vx < 0) sawNegative = true;
  }
  assert.ok(sawPositive && sawNegative, 'expected both left and right launches across 50 seeds');
}

// 5. rng is required.
{
  assert.throws(() => generateLaunchVelocity(SPEED, undefined), TypeError);
}

console.log('PASS: launch.test.js (exact seeded outputs for both signs, angle range, speed preservation, rng required)');
