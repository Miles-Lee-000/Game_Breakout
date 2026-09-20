(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Dt = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Seconds; every physics frame's dt is clamped to this (SPEC §9) so a backgrounded
  // tab, OS sleep, or a paused debugger can never feed an oversized dt into physics.
  var MAX_DT = 0.05;

  function clampDt(rawDt) {
    return Math.min(rawDt, MAX_DT);
  }

  return { clampDt: clampDt, MAX_DT: MAX_DT };
});
