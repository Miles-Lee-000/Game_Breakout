(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Walls = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly. The game always calls
  // reflectOffBoundaries with canvasW = CANVAS_W; canvasW remains a separate
  // parameter below purely so this function stays testable at other widths.
  var CANVAS_W = 480;

  // Pure wall/ceiling collision resolver per SPEC §9 ("Left/right walls" and
  // "Ceiling" bullets). Given the ball's current position/velocity, returns the
  // (possibly reflected and clamped) position/velocity plus which boundaries were
  // hit this call. More than one boundary may be hit in the same call (e.g. a
  // corner), so each check is independent rather than an early-return chain.
  function reflectOffBoundaries(ballX, ballY, vx, vy, radius, canvasW) {
    var x = ballX;
    var y = ballY;
    var newVx = vx;
    var newVy = vy;
    var hit = [];

    // Left wall: only reflect if actually moving left, so a ball resting exactly
    // on the boundary but already moving away from it isn't double-reflected.
    if (x - radius <= 0 && newVx < 0) {
      newVx = -newVx;
      x = radius;
      hit.push('left');
    }

    // Right wall: symmetric guard — only reflect if moving right.
    if (x + radius >= canvasW && newVx > 0) {
      newVx = -newVx;
      x = canvasW - radius;
      hit.push('right');
    }

    // Ceiling: only reflect if moving up.
    if (y - radius <= 0 && newVy < 0) {
      newVy = -newVy;
      y = radius;
      hit.push('ceiling');
    }

    return { x: x, y: y, vx: newVx, vy: newVy, hit: hit };
  }

  return { reflectOffBoundaries: reflectOffBoundaries };
});
