(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Coords = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Maps a pointer/touch event's viewport coordinates (clientX, clientY) into the
  // canvas's fixed logical coordinate space (logicalW x logicalH), given the canvas
  // element's on-screen bounding rect ({left, top, width, height}, e.g. from
  // getBoundingClientRect()). Works regardless of how the canvas is CSS-scaled or
  // letterboxed, since canvasRect already reflects its actual rendered box.
  function mapPointerToCanvas(clientX, clientY, canvasRect, logicalW, logicalH) {
    var scaleX = logicalW / canvasRect.width;
    var scaleY = logicalH / canvasRect.height;

    return {
      x: (clientX - canvasRect.left) * scaleX,
      y: (clientY - canvasRect.top) * scaleY,
    };
  }

  // Given the space available for the canvas (containerW x containerH) and the
  // canvas's fixed logical resolution (logicalW x logicalH), returns the {width,
  // height} to render the canvas at (in the same units as the container) so it fits
  // entirely within the container while preserving its aspect ratio exactly —
  // letterboxing on whichever axis has slack, rather than distorting it.
  function computeCanvasDisplaySize(containerW, containerH, logicalW, logicalH) {
    var containerRatio = containerW / containerH;
    var logicalRatio = logicalW / logicalH;

    if (containerRatio > logicalRatio) {
      // Container is relatively wider than the logical canvas: height is the
      // binding constraint, width follows from the aspect ratio.
      var height = containerH;
      return { width: height * logicalRatio, height: height };
    }

    var width = containerW;
    return { width: width, height: width / logicalRatio };
  }

  return {
    mapPointerToCanvas: mapPointerToCanvas,
    computeCanvasDisplaySize: computeCanvasDisplaySize,
  };
});
