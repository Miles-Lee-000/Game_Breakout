(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CollisionAxis = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Shared by paddle (Task 10) and brick (Task 13) collision handling per SPEC §9:
  // "use the minimum-translation axis to decide the bounce: compare the ball's
  // horizontal vs. vertical penetration into the [rect]'s bounding box ... the axis
  // with the smaller penetration is the one reflected." This treats the ball as its
  // own axis-aligned bounding box (documented rectangle-based approximation of true
  // circle-vs-rect collision, per SPEC §9's "Known limitation" note).
  //
  // rect = {x, y, width, height}. Returns 'x' (reflect vx — a left/right-side hit) or
  // 'y' (reflect vy — a top/bottom hit). Assumes the ball's bounding box and rect are
  // already known to overlap; behavior is undefined (may return either axis) if not.
  function resolveRectCollisionAxis(ballX, ballY, radius, rect) {
    var ballLeft = ballX - radius;
    var ballRight = ballX + radius;
    var ballTop = ballY - radius;
    var ballBottom = ballY + radius;

    var rectRight = rect.x + rect.width;
    var rectBottom = rect.y + rect.height;

    var overlapX = Math.min(ballRight, rectRight) - Math.max(ballLeft, rect.x);
    var overlapY = Math.min(ballBottom, rectBottom) - Math.max(ballTop, rect.y);

    return overlapX < overlapY ? 'x' : 'y';
  }

  return { resolveRectCollisionAxis: resolveRectCollisionAxis };
});
