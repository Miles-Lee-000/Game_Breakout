'use strict';

const assert = require('node:assert/strict');
const { computePaddleX } = require('../app/js/paddle-control.js');

const CANVAS_W = 480;
const PADDLE_W = 90;
const PADDLE_KEY_SPEED = 400;

// 1. Keys held: pointer is ignored, moves by keyboard speed.
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(['right']), pointerX: 10, dt: 0.1 });
  assert.equal(x, 100 + PADDLE_KEY_SPEED * 0.1);
}
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(['left']), pointerX: 400, dt: 0.1 });
  assert.equal(x, 100 - PADDLE_KEY_SPEED * 0.1);
}
// Both held cancels out.
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(['left', 'right']), pointerX: 400, dt: 0.1 });
  assert.equal(x, 100);
}

// 2. No keys held: snaps directly to pointerX (paddle center follows pointer).
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(), pointerX: 240, dt: 0.1 });
  assert.equal(x, 240 - PADDLE_W / 2);
}

// 3. Neither keys nor pointer available: stays put.
{
  const x = computePaddleX({ currentX: 123, heldKeys: new Set(), pointerX: null, dt: 0.1 });
  assert.equal(x, 123);
}

// 4. Clamping at both edges, in both keyboard and pointer modes.
{
  const x = computePaddleX({ currentX: 5, heldKeys: new Set(['left']), pointerX: null, dt: 1 });
  assert.equal(x, 0);
}
{
  const x = computePaddleX({ currentX: CANVAS_W - PADDLE_W - 5, heldKeys: new Set(['right']), pointerX: null, dt: 1 });
  assert.equal(x, CANVAS_W - PADDLE_W);
}
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(), pointerX: -50, dt: 0.1 });
  assert.equal(x, 0);
}
{
  const x = computePaddleX({ currentX: 100, heldKeys: new Set(), pointerX: 10000, dt: 0.1 });
  assert.equal(x, CANVAS_W - PADDLE_W);
}

// 5. Also accepts a plain array for heldKeys (not just a Set).
{
  const x = computePaddleX({ currentX: 100, heldKeys: ['right'], pointerX: null, dt: 0.1 });
  assert.equal(x, 100 + PADDLE_KEY_SPEED * 0.1);
}

console.log('PASS: paddle-control.test.js (keyboard priority, pointer fallback, no-input hold, edge clamping)');
