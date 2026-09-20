'use strict';

const assert = require('node:assert/strict');
const { mapPointerToCanvas, computeCanvasDisplaySize } = require('../app/js/coords.js');

const LOGICAL_W = 480;
const LOGICAL_H = 720;

// 1. Identity: canvas rendered at exactly its logical size, no offset.
{
  const rect = { left: 0, top: 0, width: 480, height: 720 };
  const { x, y } = mapPointerToCanvas(240, 360, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(x, 240);
  assert.equal(y, 360);
}

// 2. Scaled down: canvas rendered at half size (e.g. narrow phone viewport).
{
  const rect = { left: 0, top: 0, width: 240, height: 360 };
  const { x, y } = mapPointerToCanvas(120, 180, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(x, 240); // clicking the visual center maps to the logical center
  assert.equal(y, 360);
}

// 3. Scaled up: canvas rendered at 1.5x size (large desktop window).
{
  const rect = { left: 0, top: 0, width: 720, height: 1080 };
  const { x, y } = mapPointerToCanvas(360, 540, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(x, 240);
  assert.equal(y, 360);
}

// 4. Letterboxed with a nonzero offset: canvas centered in a wider viewport, scaled
//    down, and not flush against the top-left of the page.
{
  // Canvas rendered at 240x360, positioned at (100, 50) within the viewport.
  const rect = { left: 100, top: 50, width: 240, height: 360 };
  // Click at the canvas's own top-left corner (in viewport coords: 100, 50).
  let result = mapPointerToCanvas(100, 50, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);

  // Click at the canvas's own bottom-right corner (in viewport coords: 340, 410).
  result = mapPointerToCanvas(340, 410, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(result.x, 480);
  assert.equal(result.y, 720);

  // Click at an arbitrary interior point.
  result = mapPointerToCanvas(220, 230, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(result.x, 240); // (220-100) * (480/240) = 120 * 2 = 240
  assert.equal(result.y, 360); // (230-50)  * (720/360) = 180 * 2 = 360
}

// 5. Non-uniform scale (e.g. aspect ratio not perfectly preserved by some external
//    layout bug) — the function should still apply x/y scale independently, since it
//    has no opinion on aspect ratio, only on mapping given the actual rect.
{
  const rect = { left: 0, top: 0, width: 480, height: 360 }; // squashed vertically
  const { x, y } = mapPointerToCanvas(480, 360, rect, LOGICAL_W, LOGICAL_H);
  assert.equal(x, 480);
  assert.equal(y, 720); // scaleY = 720/360 = 2
}

// 6. computeCanvasDisplaySize: exact aspect-ratio fit (container matches ratio exactly).
{
  const { width, height } = computeCanvasDisplaySize(240, 360, LOGICAL_W, LOGICAL_H);
  assert.equal(width, 240);
  assert.equal(height, 360);
}

// 7. computeCanvasDisplaySize: wide/short container (e.g. landscape phone) — height
//    is the binding constraint, width should shrink to preserve ratio and fit.
{
  const { width, height } = computeCanvasDisplaySize(900, 400, LOGICAL_W, LOGICAL_H);
  assert.equal(height, 400);
  assert.equal(width, 400 * (LOGICAL_W / LOGICAL_H));
  assert.ok(width <= 900);
}

// 8. computeCanvasDisplaySize: narrow/tall container (e.g. portrait phone) — width
//    is the binding constraint, height should shrink to preserve ratio and fit.
{
  const { width, height } = computeCanvasDisplaySize(288, 800, LOGICAL_W, LOGICAL_H);
  assert.equal(width, 288);
  assert.equal(height, 288 / (LOGICAL_W / LOGICAL_H));
  assert.ok(height <= 800);
}

console.log('PASS: coords.test.js (8 cases: identity, scale-down, scale-up, letterboxed offset, non-uniform scale, exact-fit sizing, wide-container sizing, narrow-container sizing)');
