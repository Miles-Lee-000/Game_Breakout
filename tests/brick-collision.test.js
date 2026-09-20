'use strict';

// Plain-Node test for resolveBrickCollision (SPEC.md §9 "Bricks", PLAN.md Task 13).
// No test framework — uses node:assert/strict. Run with: node tests/brick-collision.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const { resolveBrickCollision } = require(path.join(__dirname, '..', 'app', 'js', 'brick-collision.js'));

const RADIUS = 8;

// Fixed brick rect shared by all fixtures: x=100..160, y=100..120.
const BRICK = { x: 100, y: 100, width: 60, height: 20 };

// ---------------------------------------------------------------------------
// 1. Horizontal-approach fixture: ball overlapping the brick's LEFT face.
// Ball center just left of brick.x, vertically centered in the brick's y-range so
// the y-overlap (16px) dwarfs the x-overlap (5px) — the minimum-penetration axis
// must resolve to 'x'. Ball moving right (vx > 0) into the brick.
function testLeftFaceHit() {
  const ballX = 97; // ballRight = 105, overlaps rect.x=100 by 5px
  const ballY = 110; // dead center of the brick's y-range [100, 120]
  const vx = 200;
  const vy = -150;

  const result = resolveBrickCollision(ballX, ballY, RADIUS, vx, vy, BRICK);

  assert.equal(result.vx, -vx, 'left-face hit: vx should be inverted (now negative)');
  assert.equal(result.vy, vy, 'left-face hit: vy should be unchanged');
}

// ---------------------------------------------------------------------------
// 2. Horizontal-approach fixture: ball overlapping the brick's RIGHT face.
// Ball center just right of brick.x + brick.width (160), same y-centering as above.
// Ball moving left (vx < 0) into the brick.
function testRightFaceHit() {
  const ballX = 163; // ballLeft = 155, overlaps rectRight=160 by 5px
  const ballY = 110;
  const vx = -200;
  const vy = 150;

  const result = resolveBrickCollision(ballX, ballY, RADIUS, vx, vy, BRICK);

  assert.equal(result.vx, -vx, 'right-face hit: vx should be inverted (now positive)');
  assert.equal(result.vy, vy, 'right-face hit: vy should be unchanged');
}

// ---------------------------------------------------------------------------
// 3. Vertical-approach fixture: ball overlapping the brick's TOP face.
// Ball center just above brick.y (100), horizontally centered in the brick's
// x-range so the x-overlap (16px) dwarfs the y-overlap (5px) — resolves to 'y'.
// Ball moving down (vy > 0) into the brick.
function testTopFaceHit() {
  const ballX = 130; // dead center of the brick's x-range [100, 160]
  const ballY = 97; // ballBottom = 105, overlaps rect.y=100 by 5px
  const vx = 120;
  const vy = 180;

  const result = resolveBrickCollision(ballX, ballY, RADIUS, vx, vy, BRICK);

  assert.equal(result.vy, -vy, 'top-face hit: vy should be inverted (now negative)');
  assert.equal(result.vx, vx, 'top-face hit: vx should be unchanged');
}

// ---------------------------------------------------------------------------
// 4. Vertical-approach fixture: ball overlapping the brick's BOTTOM face.
// Ball center just below brick.y + brick.height (120), same x-centering as above.
// Ball moving up (vy < 0) into the brick.
function testBottomFaceHit() {
  const ballX = 130;
  const ballY = 123; // ballTop = 115, overlaps rectBottom=120 by 5px
  const vx = -120;
  const vy = -180;

  const result = resolveBrickCollision(ballX, ballY, RADIUS, vx, vy, BRICK);

  assert.equal(result.vy, -vy, 'bottom-face hit: vy should be inverted (now positive)');
  assert.equal(result.vx, vx, 'bottom-face hit: vx should be unchanged');
}

// ---------------------------------------------------------------------------
// 5. Purity: the brick object passed in must not be mutated.
function testDoesNotMutateBrick() {
  const brick = { x: 100, y: 100, width: 60, height: 20, row: 2, col: 3 };
  const before = JSON.parse(JSON.stringify(brick));

  resolveBrickCollision(97, 110, RADIUS, 200, -150, brick);

  assert.deepEqual(brick, before, 'resolveBrickCollision must not mutate the brick argument');
}

testLeftFaceHit();
testRightFaceHit();
testTopFaceHit();
testBottomFaceHit();
testDoesNotMutateBrick();

console.log('PASS: brick-collision.test.js — all resolveBrickCollision tests passed');
console.log('  - left-face hit (axis x, vx inverted): OK');
console.log('  - right-face hit (axis x, vx inverted): OK');
console.log('  - top-face hit (axis y, vy inverted): OK');
console.log('  - bottom-face hit (axis y, vy inverted): OK');
console.log('  - brick argument not mutated: OK');
process.exit(0);
