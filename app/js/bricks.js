(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Bricks = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly.
  var CANVAS_W = 480;
  var BRICK_H = 20;
  var BRICK_GAP = 4;
  var BRICK_MARGIN_X = 10;
  var BRICK_TOP_Y = 80;

  // Builds the randomized-but-count-fixed brick layout for a level, per SPEC §7.
  // rng is a required injected RNG: () => float in [0, 1). Never uses Math.random().
  function generateBrickLayout(rows, cols, fillPct, rng) {
    if (typeof rng !== 'function') {
      throw new TypeError('generateBrickLayout requires an rng function argument');
    }

    var brickWidth = (CANVAS_W - 2 * BRICK_MARGIN_X - (cols - 1) * BRICK_GAP) / cols;
    var targetCount = Math.round(rows * cols * fillPct);

    var cells = [];
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        cells.push({ row: row, col: col });
      }
    }

    // Fisher–Yates shuffle, powered by the injected rng.
    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = cells[i];
      cells[i] = cells[j];
      cells[j] = tmp;
    }

    var selected = cells.slice(0, targetCount);

    return selected.map(function (cell) {
      return {
        x: BRICK_MARGIN_X + cell.col * (brickWidth + BRICK_GAP),
        y: BRICK_TOP_Y + cell.row * (BRICK_H + BRICK_GAP),
        width: brickWidth,
        height: BRICK_H,
        row: cell.row,
        col: cell.col,
      };
    });
  }

  return { generateBrickLayout: generateBrickLayout };
});
