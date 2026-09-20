'use strict';

// Plain-Node test for generateBrickLayout (SPEC.md §7, PLAN.md Task 11).
// No test framework — uses node:assert/strict. Run with: node tests/bricks.test.js

const assert = require('node:assert/strict');
const path = require('node:path');
const { generateBrickLayout } = require(path.join(__dirname, '..', 'app', 'js', 'bricks.js'));

const CANVAS_W = 480;
const BRICK_TOP_Y = 80;

// Deterministic seeded PRNG (mulberry32) so tests are fully reproducible.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 1. Exact-output test for a fixed seed.
//
// Config: rows=2, cols=3, fillPct=0.5, seed=12345.
// mulberry32(12345) produces (first 5 draws): 0.97972826776..., 0.30675226449...,
// 0.48420542152..., 0.81793441250..., 0.50942836934...
//
// Fisher-Yates trace over cells [ (0,0) (0,1) (0,2) (1,0) (1,1) (1,2) ] (indices 0..5):
//   i=5: j = floor(0.979728...*6) = 5  -> swap(5,5)  no-op
//   i=4: j = floor(0.306752...*5) = 1  -> swap(4,1): [.., (1,1), .., .., (0,1), ..]
//   i=3: j = floor(0.484205...*4) = 1  -> swap(3,1): [.., (1,0), .., (1,1), (0,1), ..]
//   i=2: j = floor(0.817934...*3) = 2  -> swap(2,2)  no-op
//   i=1: j = floor(0.509428...*2) = 1  -> swap(1,1)  no-op
// Final shuffled order: (0,0) (1,0) (0,2) (1,1) (0,1) (1,2)
// targetCount = round(2*3*0.5) = 3 -> first three: (0,0), (1,0), (0,2)
//
// brickWidth = (480 - 2*10 - (3-1)*4) / 3 = 452/3 = 150.666...6667
// cell(0,0): x=10,               y=80
// cell(1,0): x=10,               y=104
// cell(0,2): x=10+2*154.666...7=319.333...3, y=80
function testExactSeededOutput() {
  const rng = mulberry32(12345);
  const bricks = generateBrickLayout(2, 3, 0.5, rng);

  const brickWidth = (480 - 2 * 10 - (3 - 1) * 4) / 3;

  const expected = [
    { x: 10, y: 80, width: brickWidth, height: 20, row: 0, col: 0 },
    { x: 10, y: 104, width: brickWidth, height: 20, row: 1, col: 0 },
    { x: 10 + 2 * (brickWidth + 4), y: 80, width: brickWidth, height: 20, row: 0, col: 2 },
  ];

  assert.equal(bricks.length, expected.length, 'exact-seed test: brick count mismatch');
  for (let i = 0; i < expected.length; i++) {
    const got = bricks[i];
    const exp = expected[i];
    assert.equal(got.row, exp.row, `exact-seed test: bricks[${i}].row mismatch`);
    assert.equal(got.col, exp.col, `exact-seed test: bricks[${i}].col mismatch`);
    assert.ok(
      Math.abs(got.x - exp.x) < 1e-9,
      `exact-seed test: bricks[${i}].x mismatch (got ${got.x}, expected ${exp.x})`
    );
    assert.ok(
      Math.abs(got.y - exp.y) < 1e-9,
      `exact-seed test: bricks[${i}].y mismatch (got ${got.y}, expected ${exp.y})`
    );
    assert.ok(
      Math.abs(got.width - exp.width) < 1e-9,
      `exact-seed test: bricks[${i}].width mismatch (got ${got.width}, expected ${exp.width})`
    );
    assert.equal(got.height, exp.height, `exact-seed test: bricks[${i}].height mismatch`);
  }
}

// ---------------------------------------------------------------------------
// 2. Property-based checks (deterministic per seed) for all three SPEC level configs.
const LEVEL_CONFIGS = [
  { rows: 4, cols: 7, fillPct: 0.6, expectedCount: 17 },
  { rows: 5, cols: 8, fillPct: 0.7, expectedCount: 28 },
  { rows: 6, cols: 9, fillPct: 0.8, expectedCount: 43 },
];

function testLevelConfigProperties() {
  for (const cfg of LEVEL_CONFIGS) {
    const rng = mulberry32(42);
    const bricks = generateBrickLayout(cfg.rows, cfg.cols, cfg.fillPct, rng);

    const expectedCount = Math.round(cfg.rows * cfg.cols * cfg.fillPct);
    assert.equal(
      expectedCount,
      cfg.expectedCount,
      `sanity: round(rows*cols*fillPct) mismatch for config ${JSON.stringify(cfg)}`
    );
    assert.equal(
      bricks.length,
      cfg.expectedCount,
      `brick count mismatch for config ${JSON.stringify(cfg)}`
    );

    const seen = new Set();
    for (const b of bricks) {
      assert.ok(b.x >= 0, `brick x < 0 for config ${JSON.stringify(cfg)}: ${JSON.stringify(b)}`);
      assert.ok(
        b.x + b.width <= CANVAS_W + 1e-9,
        `brick exceeds right canvas bound for config ${JSON.stringify(cfg)}: ${JSON.stringify(b)}`
      );
      assert.ok(
        b.y >= BRICK_TOP_Y,
        `brick y < BRICK_TOP_Y for config ${JSON.stringify(cfg)}: ${JSON.stringify(b)}`
      );

      const key = b.row + ',' + b.col;
      assert.ok(
        !seen.has(key),
        `duplicate (row,col) cell ${key} for config ${JSON.stringify(cfg)}`
      );
      seen.add(key);
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Different seeds produce different arrangements, but the same fixed count.
function testSeedVariationChangesArrangement() {
  const cfg = { rows: 5, cols: 8, fillPct: 0.7, expectedCount: 28 };
  const seeds = [1, 2, 3, 4, 5];
  const arrangements = seeds.map((seed) => {
    const rng = mulberry32(seed);
    const bricks = generateBrickLayout(cfg.rows, cfg.cols, cfg.fillPct, rng);
    assert.equal(
      bricks.length,
      cfg.expectedCount,
      `count changed across seeds for seed ${seed}`
    );
    const cellSet = bricks
      .map((b) => b.row + ',' + b.col)
      .sort()
      .join('|');
    return cellSet;
  });

  const uniqueArrangements = new Set(arrangements);
  assert.ok(
    uniqueArrangements.size > 1,
    `expected different seeds to produce different arrangements, got all identical: ${arrangements[0]}`
  );
}

// ---------------------------------------------------------------------------
// 4. rng is required — Math.random() must never be called inside bricks.js.
function testRngIsRequired() {
  assert.throws(
    () => generateBrickLayout(4, 7, 0.6, undefined),
    TypeError,
    'expected generateBrickLayout to throw when rng is not provided'
  );
}

testExactSeededOutput();
testLevelConfigProperties();
testSeedVariationChangesArrangement();
testRngIsRequired();

console.log('PASS: bricks.test.js — all generateBrickLayout tests passed');
console.log('  - exact seeded-output test (seed=12345, rows=2 cols=3 fillPct=0.5): OK');
console.log('  - level-config property tests (counts 17/28/43, bounds, no dupes): OK');
console.log('  - cross-seed arrangement variation with fixed count: OK');
console.log('  - rng-required guard: OK');
process.exit(0);
