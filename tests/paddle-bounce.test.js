'use strict';

// Plain-Node test for paddleTopBounce / paddleSideBounce (SPEC.md §9 "Paddle",
// PLAN.md Task 10). No test framework — uses node:assert/strict.
// Run with: node tests/paddle-bounce.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const { paddleTopBounce, paddleSideBounce } = require(path.join(__dirname, '..', 'app', 'js', 'paddle-bounce.js'));

const PADDLE_MAX_BOUNCE_ANGLE_DEG = 60;
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// 1. Center hit: ballX exactly at paddle center -> vx === 0, vy === -speed exactly.
function testCenterHit() {
  const paddleX = 100;
  const paddleWidth = 90;
  const speed = 300;
  const paddleCenterX = paddleX + paddleWidth / 2;

  const { vx, vy } = paddleTopBounce(paddleCenterX, paddleX, paddleWidth, speed);

  assert.equal(vx, 0, 'center hit: vx must be exactly 0');
  assert.equal(vy, -speed, 'center hit: vy must be exactly -speed');
}

// ---------------------------------------------------------------------------
// 2. Exact left/right edges -> angle is exactly +/-60 degrees from vertical.
function testExactEdges() {
  const paddleX = 100;
  const paddleWidth = 90;
  const speed = 300;
  const angleRad = (PADDLE_MAX_BOUNCE_ANGLE_DEG * Math.PI) / 180;
  const expectedVxMag = speed * Math.sin(angleRad);
  const expectedVy = -speed * Math.cos(angleRad);

  // Left edge: ballX = paddleX -> relativeIntersectX = -1 -> angle = -60deg.
  {
    const { vx, vy } = paddleTopBounce(paddleX, paddleX, paddleWidth, speed);
    assert.ok(Math.abs(vx - -expectedVxMag) < EPS, `left edge: vx mismatch (got ${vx})`);
    assert.ok(Math.abs(vy - expectedVy) < EPS, `left edge: vy mismatch (got ${vy})`);
  }

  // Right edge: ballX = paddleX + paddleWidth -> relativeIntersectX = +1 -> angle = +60deg.
  {
    const { vx, vy } = paddleTopBounce(paddleX + paddleWidth, paddleX, paddleWidth, speed);
    assert.ok(Math.abs(vx - expectedVxMag) < EPS, `right edge: vx mismatch (got ${vx})`);
    assert.ok(Math.abs(vy - expectedVy) < EPS, `right edge: vy mismatch (got ${vy})`);
  }
}

// ---------------------------------------------------------------------------
// 3. relativeIntersectX clamping: ballX values including ones outside the paddle
// (ball has nonzero radius and can contact the paddle slightly beyond its horizontal
// extent) must never push the angle beyond +/-60deg, and speed must be preserved.
function testClampingAndSpeedPreservation() {
  const paddleX = 100;
  const paddleWidth = 90;
  const speed = 300;
  const paddleCenterX = paddleX + paddleWidth / 2;
  const halfWidth = paddleWidth / 2;

  const sampleBallXs = [
    paddleX - 50, // far outside left edge
    paddleX - 1, // just past left edge (ball radius overlap)
    paddleX, // exact left edge
    paddleX + halfWidth / 2, // quarter-right of center
    paddleCenterX, // exact center
    paddleX + paddleWidth - halfWidth / 2, // quarter-left of right edge (via right side)
    paddleX + paddleWidth, // exact right edge
    paddleX + paddleWidth + 1, // just past right edge
    paddleX + paddleWidth + 50, // far outside right edge
  ];

  const maxAngleRad = (PADDLE_MAX_BOUNCE_ANGLE_DEG * Math.PI) / 180;
  const maxVxMag = speed * Math.sin(maxAngleRad);

  for (const ballX of sampleBallXs) {
    const { vx, vy } = paddleTopBounce(ballX, paddleX, paddleWidth, speed);

    // Angle from vertical never exceeds 60 degrees in magnitude: |vx| never exceeds
    // the magnitude produced at the +/-60deg extremes.
    assert.ok(
      Math.abs(vx) <= maxVxMag + EPS,
      `ballX=${ballX}: |vx|=${Math.abs(vx)} exceeds the 60deg-from-vertical bound ${maxVxMag}`
    );

    // Speed is preserved exactly (formula only redirects, never changes magnitude).
    const resultSpeed = Math.hypot(vx, vy);
    assert.ok(
      Math.abs(resultSpeed - speed) < EPS,
      `ballX=${ballX}: Math.hypot(vx, vy)=${resultSpeed} !== speed=${speed}`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. paddleSideBounce: vx is exactly negated, vy is exactly unchanged (same value,
// same sign), for several inputs covering both signs of vx and vy.
function testSideBounce() {
  const cases = [
    { vx: 150, vy: 200 },
    { vx: -150, vy: 200 },
    { vx: 150, vy: -200 },
    { vx: -150, vy: -200 },
    { vx: 0, vy: 300 },
    { vx: 250.5, vy: -0 },
  ];

  for (const { vx, vy } of cases) {
    const result = paddleSideBounce(vx, vy);
    assert.equal(result.vx, -vx, `paddleSideBounce(${vx}, ${vy}): vx not exactly negated`);
    assert.equal(result.vy, vy, `paddleSideBounce(${vx}, ${vy}): vy changed (got ${result.vy})`);
  }
}

testCenterHit();
testExactEdges();
testClampingAndSpeedPreservation();
testSideBounce();

console.log('PASS: paddle-bounce.test.js — all paddleTopBounce/paddleSideBounce tests passed');
console.log('  - center hit (vx===0, vy===-speed exactly): OK');
console.log('  - exact left/right edge angles (+/-60deg from vertical): OK');
console.log('  - relativeIntersectX clamping to [-1,1] + speed preservation (incl. outside-paddle ballX): OK');
console.log('  - paddleSideBounce vx negation / vy unchanged (both signs): OK');
process.exit(0);
