(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./collision-axis.js'));
  } else {
    root.BrickCollision = factory(root.CollisionAxis);
  }
})(typeof self !== 'undefined' ? self : this, function (CollisionAxis) {
  'use strict';

  // Ball-vs-brick bounce resolution — SPEC.md §9, "Bricks" (PLAN.md Task 13). Given a
  // ball already known to be overlapping one specific brick rect, decides which axis
  // to reflect using the shared minimum-penetration-axis test (CollisionAxis, also
  // used by the paddle per Task 10) and returns the reflected velocity.
  //
  // This function does NOT decide which brick was hit, does NOT remove anything from a
  // bricks array, and does NOT touch bricksClearedThisLevel — those are integration
  // concerns for the game loop (a later task). It only answers: given this ball and
  // this brick, what should the new velocity be?
  //
  // brick = {x, y, width, height, ...}; any extra fields (e.g. row/col) are ignored.
  // Pure: does not mutate brick, does not touch the DOM, no randomness.
  function resolveBrickCollision(ballX, ballY, radius, vx, vy, brick) {
    var axis = CollisionAxis.resolveRectCollisionAxis(ballX, ballY, radius, brick);

    if (axis === 'x') {
      // Horizontal-side hit (left/right face): invert vx, leave vy unchanged.
      return { vx: -vx, vy: vy };
    }

    // Vertical hit (top/bottom face): invert vy, leave vx unchanged.
    return { vx: vx, vy: -vy };
  }

  return { resolveBrickCollision: resolveBrickCollision };
});
