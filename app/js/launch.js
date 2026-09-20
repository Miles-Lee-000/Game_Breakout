(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Launch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly.
  var LAUNCH_MIN_ANGLE_DEG = 15;
  var LAUNCH_MAX_ANGLE_DEG = 50;

  function degreesToRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  // Per SPEC §5/§6: all gameplay randomness is injected via an `rng: () => float in
  // [0,1)` argument rather than calling Math.random() internally, so this stays
  // deterministically testable. Production call sites pass Math.random itself.
  function generateLaunchVelocity(speed, rng) {
    if (typeof rng !== 'function') {
      throw new TypeError('generateLaunchVelocity requires an rng function argument');
    }

    var sign = rng() < 0.5 ? -1 : 1;
    var angleDeg = sign * (LAUNCH_MIN_ANGLE_DEG + rng() * (LAUNCH_MAX_ANGLE_DEG - LAUNCH_MIN_ANGLE_DEG));
    var angleRad = degreesToRadians(angleDeg);

    return {
      vx: speed * Math.sin(angleRad),
      vy: -speed * Math.cos(angleRad), // negative = upward
    };
  }

  return { generateLaunchVelocity: generateLaunchVelocity };
});
