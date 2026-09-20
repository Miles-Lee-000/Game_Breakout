(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PaddleBounce = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly.
  var PADDLE_MAX_BOUNCE_ANGLE_DEG = 60;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function degreesToRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  // Paddle "top hit" bounce formula (the ball approaches from above, vertical
  // penetration is the smaller one per CollisionAxis.resolveRectCollisionAxis) —
  // SPEC.md §9, "Paddle" > "Top hit". Reflects speed (unchanged in magnitude) into a
  // new direction based on where along the paddle's width the ball made contact:
  // dead center sends it straight up, the edges send it up to
  // PADDLE_MAX_BOUNCE_ANGLE_DEG from vertical, to the left or right accordingly. Does
  // NOT apply the degenerate-angle guard (SPEC §9 step 2 of the collision pipeline) —
  // that is a separate step applied by the caller, not here.
  function paddleTopBounce(ballX, paddleX, paddleWidth, speed) {
    var paddleCenterX = paddleX + paddleWidth / 2;
    var relativeIntersectX = clamp((ballX - paddleCenterX) / (paddleWidth / 2), -1, 1);
    var angle = relativeIntersectX * PADDLE_MAX_BOUNCE_ANGLE_DEG;
    var angleRad = degreesToRadians(angle);

    return {
      vx: speed * Math.sin(angleRad),
      vy: -speed * Math.cos(angleRad),
    };
  }

  // Paddle "side hit" bounce formula (a shallow-angle ball clipping the paddle's
  // left/right edge, horizontal penetration is the smaller one) — SPEC.md §9,
  // "Paddle" > "Side hit". Treated like a wall: invert vx, leave vy (and its sign)
  // completely unchanged. The caller is responsible for first calling
  // CollisionAxis.resolveRectCollisionAxis(...) (app/js/collision-axis.js) to decide
  // whether a paddle hit is a top hit (call paddleTopBounce) or a side hit (call this
  // function) — this file only provides the two bounce formulas, not that dispatch.
  function paddleSideBounce(vx, vy) {
    return { vx: -vx, vy: vy };
  }

  return {
    paddleTopBounce: paddleTopBounce,
    paddleSideBounce: paddleSideBounce,
  };
});
