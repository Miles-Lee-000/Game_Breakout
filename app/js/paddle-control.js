(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.PaddleControl = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CANVAS_W = 480;
  var PADDLE_W = 90;
  var PADDLE_KEY_SPEED = 400; // px/s

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Decides the paddle's new x (its left edge) for one frame, per SPEC §4's input
  // arbitration rule: keyboard always wins whenever any movement key is held,
  // decided fresh every frame rather than by racing mousemove/keydown events.
  //
  // opts = {
  //   currentX,          // paddle's current left-edge x
  //   heldKeys,          // a Set (or array) containing any of 'left'/'right'
  //   pointerX,          // latest known pointer center-x in logical canvas space, or
  //                      // null if no pointer/touch position is available yet
  //   dt,                // seconds
  // }
  function computePaddleX(opts) {
    var currentX = opts.currentX;
    var heldKeys = opts.heldKeys;
    var pointerX = opts.pointerX;
    var dt = opts.dt;

    var hasLeft = heldKeys.has ? heldKeys.has('left') : heldKeys.indexOf('left') !== -1;
    var hasRight = heldKeys.has ? heldKeys.has('right') : heldKeys.indexOf('right') !== -1;
    var keysHeld = hasLeft || hasRight;

    var newX;
    if (keysHeld) {
      var net = (hasRight ? 1 : 0) - (hasLeft ? 1 : 0);
      newX = currentX + net * PADDLE_KEY_SPEED * dt;
    } else if (pointerX !== null && pointerX !== undefined) {
      newX = pointerX - PADDLE_W / 2;
    } else {
      newX = currentX;
    }

    return clamp(newX, 0, CANVAS_W - PADDLE_W);
  }

  return { computePaddleX: computePaddleX };
});
