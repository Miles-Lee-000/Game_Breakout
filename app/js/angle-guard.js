(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.AngleGuard = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly.
  var MIN_ANGLE_FROM_VERTICAL_DEG = 8;
  var MAX_ANGLE_FROM_VERTICAL_DEG = 82;

  // Degenerate-angle guard (SPEC.md §9, "Degenerate-angle guard" — fixed).
  //
  // Applied after every reflection (wall, ceiling, paddle, brick) so the ball can never
  // travel purely vertically or purely horizontally for longer than the instant of a
  // single bounce. This only ever changes *direction*, never magnitude (V is preserved).
  //
  // Critical fix this function exists for: `Math.sign(0) === 0` in JavaScript. Without
  // the explicit `vx === 0 ? 1 : Math.sign(vx)` tie-break (and the analogous one for
  // vy), a dead-center paddle hit (vx === 0, ball moving straight up) would compute
  // sx = Math.sign(0) = 0, so the clamped vx would be forced to exactly 0 forever —
  // the ball would stay permanently and perfectly vertical. The literal ternary below
  // is required; do not simplify it to `Math.sign(vx) || 1`, since that is not
  // equivalent when vx is a negative value that legitimately signs to -1 (or -0).
  function enforceAngleGuard(vx, vy) {
    var V = Math.hypot(vx, vy);
    // Angle from vertical, in degrees, in [0°, 90°].
    var phiDeg = (Math.atan2(Math.abs(vx), Math.abs(vy)) * 180) / Math.PI;

    if (phiDeg >= MIN_ANGLE_FROM_VERTICAL_DEG && phiDeg <= MAX_ANGLE_FROM_VERTICAL_DEG) {
      return { vx: vx, vy: vy }; // already fine, no change
    }

    var clampedPhiDeg = Math.min(
      Math.max(phiDeg, MIN_ANGLE_FROM_VERTICAL_DEG),
      MAX_ANGLE_FROM_VERTICAL_DEG
    );
    var sx = vx === 0 ? 1 : Math.sign(vx); // tie-break: default rightward
    var sy = vy === 0 ? -1 : Math.sign(vy); // tie-break: default upward (should not occur)

    var clampedPhiRad = (clampedPhiDeg * Math.PI) / 180;

    return {
      vx: V * Math.sin(clampedPhiRad) * sx,
      vy: V * Math.cos(clampedPhiRad) * sy,
    };
  }

  return {
    enforceAngleGuard: enforceAngleGuard,
    MIN_ANGLE_FROM_VERTICAL_DEG: MIN_ANGLE_FROM_VERTICAL_DEG,
    MAX_ANGLE_FROM_VERTICAL_DEG: MAX_ANGLE_FROM_VERTICAL_DEG,
  };
});
