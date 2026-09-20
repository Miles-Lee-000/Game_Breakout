(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Substep = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Computes how many substeps a frame's motion must be split into so that no single
  // substep's displacement exceeds radius (BALL_RADIUS), per SPEC §9's anti-tunneling
  // paragraph: if |v| * dt exceeds BALL_RADIUS, split into N = ceil(|v| * dt / radius)
  // substeps. speed is the ball's scalar speed |v| (already computed by the caller).
  function computeSubstepCount(speed, dt, radius) {
    if (speed * dt <= radius) {
      return 1;
    }
    return Math.ceil((speed * dt) / radius);
  }

  return {
    computeSubstepCount: computeSubstepCount,
  };
});
