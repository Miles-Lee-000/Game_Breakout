'use strict';

// Plain-Node test for enforceAngleGuard (SPEC.md §9 "Degenerate-angle guard", PLAN.md
// Task 14). No test framework — uses node:assert/strict. Run with:
//   node tests/angle-guard.test.js
//
// This guard exists specifically because an independent review of an earlier spec draft
// found that `Math.sign(0) === 0` in JavaScript broke the original (unfixed) formula: a
// dead-center paddle hit sends the ball off with vx === 0, and computing
// sx = Math.sign(vx) in that case yields 0 — permanently zeroing vx on every subsequent
// guard application, so the ball gets stuck traveling exactly vertically forever. The fix
// is the `vx === 0 ? 1 : Math.sign(vx)` (and analogous vy) tie-break. Test 1 below is
// that exact regression case and is the most important test in this file.

const assert = require('node:assert/strict');
const path = require('node:path');
const { enforceAngleGuard, MIN_ANGLE_FROM_VERTICAL_DEG, MAX_ANGLE_FROM_VERTICAL_DEG } = require(
  path.join(__dirname, '..', 'app', 'js', 'angle-guard.js')
);

const EPS = 1e-9;

function angleFromVerticalDeg(vx, vy) {
  return (Math.atan2(Math.abs(vx), Math.abs(vy)) * 180) / Math.PI;
}

function closeTo(actual, expected, msg) {
  assert.ok(
    Math.abs(actual - expected) < EPS,
    `${msg} (got ${actual}, expected ${expected}, diff ${Math.abs(actual - expected)})`
  );
}

// ---------------------------------------------------------------------------
// 1. CRITICAL REGRESSION TEST — the exact defect the independent review flagged.
//
// enforceAngleGuard(0, -300): a dead-center paddle hit sending the ball straight up.
// The broken original formula computed sx = Math.sign(vx) = Math.sign(0) = 0, so vx
// stayed exactly 0 forever (the ball parks permanently vertical). The fixed formula's
// `vx === 0 ? 1 : Math.sign(vx)` tie-break must instead deflect it rightward by exactly
// MIN_ANGLE_FROM_VERTICAL_DEG (8°), while preserving speed and the upward direction.
function testCriticalRegression_DeadCenterStraightUp() {
  const { vx, vy } = enforceAngleGuard(0, -300);

  assert.ok(vx > 0, `REGRESSION: expected vx > 0 (strictly positive), got vx = ${vx} — ` +
    'this is the exact Math.sign(0) === 0 bug the guard exists to fix');
  assert.ok(vy < 0, `expected vy < 0 (still moving upward), got vy = ${vy}`);

  const phiDeg = angleFromVerticalDeg(vx, vy);
  closeTo(phiDeg, MIN_ANGLE_FROM_VERTICAL_DEG, 'expected angle-from-vertical to equal exactly 8°');

  closeTo(Math.hypot(vx, vy), 300, 'expected speed to be preserved at 300');
}

// ---------------------------------------------------------------------------
// 2. Hypothetical downward exact-vertical case: enforceAngleGuard(0, 300).
// The sy tie-break must NOT apply here since vy !== 0 — vy should keep its natural
// (positive/downward) sign. vx still gets the rightward tie-break since vx === 0.
function testDownwardExactVertical_SyTieBreakDoesNotApply() {
  const { vx, vy } = enforceAngleGuard(0, 300);

  assert.ok(vx > 0, `expected vx > 0 (rightward tie-break for vx === 0), got vx = ${vx}`);
  assert.ok(vy > 0, `expected vy to keep its natural positive (downward) sign, got vy = ${vy}`);

  const phiDeg = angleFromVerticalDeg(vx, vy);
  closeTo(phiDeg, MIN_ANGLE_FROM_VERTICAL_DEG, 'expected angle-from-vertical to equal exactly 8°');
  closeTo(Math.hypot(vx, vy), 300, 'expected speed to be preserved at 300');
}

// ---------------------------------------------------------------------------
// 3. Near-horizontal input clamped down to MAX_ANGLE_FROM_VERTICAL_DEG (82°), with
// speed and the original signs of vx/vy preserved. Use a ~89°-from-vertical input with
// both components negative to also confirm sign preservation (not the vx/vy === 0
// tie-break path, since neither component is zero here).
function testNearHorizontalClampedToMax() {
  const V = 500;
  const inputDeg = 89;
  const rad = (inputDeg * Math.PI) / 180;
  const vxIn = -V * Math.sin(rad); // negative
  const vyIn = -V * Math.cos(rad); // negative (small magnitude — near horizontal)

  const { vx, vy } = enforceAngleGuard(vxIn, vyIn);

  assert.ok(vx < 0, `expected vx to keep its original negative sign, got vx = ${vx}`);
  assert.ok(vy < 0, `expected vy to keep its original negative sign, got vy = ${vy}`);

  const phiDeg = angleFromVerticalDeg(vx, vy);
  closeTo(phiDeg, MAX_ANGLE_FROM_VERTICAL_DEG, 'expected angle-from-vertical to be clamped to exactly 82°');
  closeTo(Math.hypot(vx, vy), V, 'expected speed to be preserved');
}

// ---------------------------------------------------------------------------
// 4. Input already within the valid range (45° from vertical) must be returned
// completely unchanged — same vx, vy, bit-for-bit — because the function short-circuits
// and returns the input pair as-is without recomputing anything.
function testAlreadyInRange_ReturnedUnchangedExactly() {
  const vxIn = 100;
  const vyIn = -100; // atan2(100, 100) = 45°, comfortably inside [8°, 82°]

  const phiDegIn = angleFromVerticalDeg(vxIn, vyIn);
  assert.ok(
    phiDegIn > MIN_ANGLE_FROM_VERTICAL_DEG && phiDegIn < MAX_ANGLE_FROM_VERTICAL_DEG,
    'sanity check: 45° fixture must fall strictly inside the valid range'
  );

  const { vx, vy } = enforceAngleGuard(vxIn, vyIn);
  assert.equal(vx, vxIn, 'expected vx to be returned bit-exactly unchanged');
  assert.equal(vy, vyIn, 'expected vy to be returned bit-exactly unchanged');
}

// ---------------------------------------------------------------------------
// 5. Boundary-exact inputs — exactly at 8° and exactly at 82° from vertical — must be
// returned unchanged (inclusive bounds: MIN_ANGLE_FROM_VERTICAL_DEG <= phi <=
// MAX_ANGLE_FROM_VERTICAL_DEG, i.e. <=/>= not </>).
function testBoundaryExactInputsReturnedUnchanged() {
  const V = 300;

  for (const deg of [MIN_ANGLE_FROM_VERTICAL_DEG, MAX_ANGLE_FROM_VERTICAL_DEG]) {
    const rad = (deg * Math.PI) / 180;
    const vxIn = V * Math.sin(rad);
    const vyIn = -V * Math.cos(rad);

    const { vx, vy } = enforceAngleGuard(vxIn, vyIn);

    assert.equal(vx, vxIn, `expected vx unchanged at boundary ${deg}°`);
    assert.equal(vy, vyIn, `expected vy unchanged at boundary ${deg}°`);
  }
}

// ---------------------------------------------------------------------------
// 6. Speed preservation across clamped cases: the guard must never change speed, only
// direction. Check at least 3 different clamped-input cases: near-vertical,
// near-horizontal, and the dead-center vx === 0 case.
function testSpeedPreservedAcrossClampedCases() {
  const cases = [
    { label: 'near-vertical (2° from vertical)', vx: 300 * Math.sin((2 * Math.PI) / 180), vy: -300 * Math.cos((2 * Math.PI) / 180) },
    { label: 'near-horizontal (88° from vertical)', vx: 200 * Math.sin((88 * Math.PI) / 180), vy: -200 * Math.cos((88 * Math.PI) / 180) },
    { label: 'dead-center vx === 0 case', vx: 0, vy: -450 },
  ];

  for (const c of cases) {
    const inputSpeed = Math.hypot(c.vx, c.vy);
    const { vx, vy } = enforceAngleGuard(c.vx, c.vy);
    const outputSpeed = Math.hypot(vx, vy);
    closeTo(outputSpeed, inputSpeed, `expected speed preserved for case: ${c.label}`);
  }
}

testCriticalRegression_DeadCenterStraightUp();
testDownwardExactVertical_SyTieBreakDoesNotApply();
testNearHorizontalClampedToMax();
testAlreadyInRange_ReturnedUnchangedExactly();
testBoundaryExactInputsReturnedUnchanged();
testSpeedPreservedAcrossClampedCases();

console.log('PASS: angle-guard.test.js — all enforceAngleGuard tests passed');
console.log('  - CRITICAL regression test (dead-center vx=0 straight-up hit, vx now > 0, phi = 8deg): OK');
console.log('  - downward exact-vertical case (sy tie-break does not apply): OK');
console.log('  - near-horizontal input clamped to 82deg with signs preserved: OK');
console.log('  - already-in-range (45deg) input returned bit-exactly unchanged: OK');
console.log('  - boundary-exact inputs (8deg, 82deg) returned unchanged (inclusive bounds): OK');
console.log('  - speed preserved across 3 clamped cases (near-vertical, near-horizontal, dead-center): OK');
process.exit(0);
