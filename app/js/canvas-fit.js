// Applies Coords.computeCanvasDisplaySize() to the #game canvas so it always fits
// #canvas-wrap while preserving its 480x720 logical aspect ratio, on load and on
// resize. Browser-only (not required from Node), so no dual export wrapper needed.
(function () {
  'use strict';

  function fitCanvas() {
    var canvas = document.getElementById('game');
    var wrap = document.getElementById('canvas-wrap');
    if (!canvas || !wrap) return;

    var logicalW = canvas.width;
    var logicalH = canvas.height;
    var containerW = wrap.clientWidth;
    var containerH = wrap.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    var size = window.Coords.computeCanvasDisplaySize(containerW, containerH, logicalW, logicalH);
    canvas.style.width = size.width + 'px';
    canvas.style.height = size.height + 'px';
  }

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', fitCanvas);
  document.addEventListener('DOMContentLoaded', fitCanvas);
})();
