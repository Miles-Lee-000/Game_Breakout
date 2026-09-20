(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Speed = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants — must match SPEC.md §3 exactly.
  var LEVEL_BASE_SPEEDS = [300, 330, 360];
  var SPEED_PER_BRICK = 0.02;
  var SPEED_CAP_MULT = 1.5;

  // SPEC §8: currentLevelSpeed() = LEVELS[level].base * min(1 + 0.02*bricksCleared, 1.5)
  function currentLevelSpeed(levelIndex, bricksClearedThisLevel) {
    var base = LEVEL_BASE_SPEEDS[levelIndex];
    return base * Math.min(1 + SPEED_PER_BRICK * bricksClearedThisLevel, SPEED_CAP_MULT);
  }

  return { currentLevelSpeed: currentLevelSpeed };
});
