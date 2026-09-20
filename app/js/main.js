// Game loop skeleton (PLAN.md Task 3). Later tasks extend update()/render() with real
// paddle/ball/brick simulation and rendering; for now this only proves the loop runs,
// freezes on Pause, resumes on Pause again, and that Start/Pause behave correctly
// (no-op + visually disabled) outside their active states, per SPEC §2's button table.
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var startBtn = document.getElementById('startBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var livesEl = document.getElementById('lives');
  var levelEl = document.getElementById('level');

  // SPEC.md §3 constants needed so far.
  var CANVAS_W = 480;
  var CANVAS_H = 720;
  var LIVES_START = 3;
  var PADDLE_W = 90;
  var PADDLE_H = 14;
  var PADDLE_Y = 720 - 40;
  var BALL_RADIUS = 8;
  var LEVELS = [
    { base: 300, rows: 4, cols: 7, fillPct: 0.6 },
    { base: 330, rows: 5, cols: 8, fillPct: 0.7 },
    { base: 360, rows: 6, cols: 9, fillPct: 0.8 },
  ];
  var COLOR_BRICK_ROW_PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  // States used so far: 'idle', 'playing', 'paused', 'levelClear', 'fail'. Task 18
  // adds 'victory' — this state variable and updateButtonStates() already extend to
  // it without changing shape (Start/Pause are already disabled in any state besides
  // their own listed ones).
  var state = 'idle';
  var frameCount = 0;
  var lastFrameTime = null;

  // 0-based index into LEVELS.
  var currentLevel = 0;
  var LEVEL_CLEAR_DURATION = 1; // seconds, SPEC §2/§10
  var levelClearTimer = 0;

  function advanceLevel() {
    if (currentLevel < LEVELS.length - 1) {
      currentLevel++;
      var cfg = LEVELS[currentLevel];
      bricks = window.Bricks.generateBrickLayout(cfg.rows, cfg.cols, cfg.fillPct, Math.random);
      bricksClearedThisLevel = 0;
      ballWaiting = true;
      levelEl.textContent = 'Level ' + (currentLevel + 1) + ' / ' + LEVELS.length;
      state = 'playing';
    } else {
      state = 'victory'; // overlay rendering added in Task 18
    }
    updateButtonStates();
  }

  function rescaleVelocity(vx, vy, speed) {
    var mag = Math.hypot(vx, vy);
    var scale = speed / mag;
    return { vx: vx * scale, vy: vy * scale };
  }

  // Debug-only instrumentation (PLAN.md Task 16): the largest penetration depth ever
  // observed at the moment of each collision type, i.e. how far the ball's bounding
  // box had already crossed a boundary/rect before that collision's correction ran
  // this substep. Read by the Task 22 objective anti-tunneling check
  // (MAX_ALLOWED_PENETRATION_PX, SPEC §3/§11); not used by gameplay itself.
  window.__debugMaxPenetration = { wall: 0, ceiling: 0, paddle: 0, brick: 0 };

  function notePenetration(kind, depth) {
    if (depth > window.__debugMaxPenetration[kind]) {
      window.__debugMaxPenetration[kind] = depth;
    }
  }

  var paddleX = (CANVAS_W - PADDLE_W) / 2;

  // Ball state (PLAN.md Task 6/7). While waiting to launch, the ball has no velocity of
  // its own and simply tracks the paddle's current x every frame (SPEC §6). Once
  // launched, ballX/ballY/ballVx/ballVy drive its own motion instead.
  var ballWaiting = true;
  var ballX = 0;
  var ballY = 0;
  var ballVx = 0;
  var ballVy = 0;

  var lives = LIVES_START;

  // Bricks (PLAN.md Task 11/12). Only level 1's layout is generated for now; level
  // progression and regeneration on level clear come in Task 17.
  var bricks = window.Bricks.generateBrickLayout(LEVELS[0].rows, LEVELS[0].cols, LEVELS[0].fillPct, Math.random);
  var bricksClearedThisLevel = 0;

  // Debug-only hook so integration tests can shrink the current level down to a few
  // bricks instead of waiting for real gameplay to clear a full layout; not used by
  // gameplay itself.
  window.__debugSetBricks = function (newBricks) {
    bricks = newBricks;
  };

  function setLives(n) {
    lives = n;
    livesEl.textContent = 'Lives: ' + lives;
  }

  function launchBall() {
    if (state !== 'playing' || !ballWaiting) return;
    ballX = paddleX + PADDLE_W / 2;
    ballY = PADDLE_Y - BALL_RADIUS;
    var launchSpeed = window.Speed.currentLevelSpeed(currentLevel, bricksClearedThisLevel);
    var v = window.Launch.generateLaunchVelocity(launchSpeed, Math.random);
    ballVx = v.vx;
    ballVy = v.vy;
    ballWaiting = false;
  }

  // Tracks currently-held movement keys via keydown(add)/keyup(remove) rather than
  // relying on the browser re-firing keydown for a held key — see SPEC §4.
  var heldKeys = new Set();

  function keyToDirection(key) {
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
    if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
    return null;
  }

  window.addEventListener('keydown', function (e) {
    var dir = keyToDirection(e.key);
    if (dir) heldKeys.add(dir);
  });

  window.addEventListener('keyup', function (e) {
    var dir = keyToDirection(e.key);
    if (dir) heldKeys.delete(dir);
  });

  // Latest known pointer/touch x in logical canvas-space coordinates, or null if
  // none has been seen yet. Only used when heldKeys is empty — see SPEC §4.
  var pointerX = null;

  function updatePointerXFromEvent(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var mapped = window.Coords.mapPointerToCanvas(clientX, clientY, rect, canvas.width, canvas.height);
    pointerX = mapped.x;
  }

  canvas.addEventListener('mousemove', function (e) {
    updatePointerXFromEvent(e.clientX, e.clientY);
  });

  canvas.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    if (t) updatePointerXFromEvent(t.clientX, t.clientY);
    launchBall();
  });

  canvas.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    if (t) updatePointerXFromEvent(t.clientX, t.clientY);
  });

  canvas.addEventListener('click', function () {
    launchBall();
  });

  function updateButtonStates() {
    startBtn.disabled = state !== 'idle';
    pauseBtn.disabled = state !== 'playing' && state !== 'paused';
  }

  startBtn.addEventListener('click', function () {
    if (state !== 'idle') return; // no-op outside idle, per SPEC §2
    state = 'playing';
    updateButtonStates();
  });

  pauseBtn.addEventListener('click', function () {
    if (state === 'playing') {
      state = 'paused';
    } else if (state === 'paused') {
      state = 'playing';
    } else {
      return; // no-op outside playing/paused, per SPEC §2
    }
    updateButtonStates();
  });

  // Advances the ball by exactly one substep (SPEC §9's anti-tunneling scheme: each
  // substep's displacement never exceeds BALL_RADIUS before a collision check), doing
  // one full move + all collision checks. Returns true if the caller should stop
  // processing further substeps this frame (ball reset to waiting, or game over).
  function stepBall(subDt) {
    ballX += ballVx * subDt;
    ballY += ballVy * subDt;

    var preWallX = ballX;
    var preWallY = ballY;
    var reflected = window.Walls.reflectOffBoundaries(ballX, ballY, ballVx, ballVy, BALL_RADIUS, CANVAS_W);
    ballX = reflected.x;
    ballY = reflected.y;
    ballVx = reflected.vx;
    ballVy = reflected.vy;
    if (reflected.hit.length > 0) {
      if (reflected.hit.indexOf('ceiling') !== -1) {
        notePenetration('ceiling', BALL_RADIUS - preWallY);
      }
      if (reflected.hit.indexOf('left') !== -1 || reflected.hit.indexOf('right') !== -1) {
        var wallPen = reflected.hit.indexOf('left') !== -1 ? BALL_RADIUS - preWallX : preWallX - (CANVAS_W - BALL_RADIUS);
        notePenetration('wall', wallPen);
      }
      var guardedWall = window.AngleGuard.enforceAngleGuard(ballVx, ballVy);
      ballVx = guardedWall.vx;
      ballVy = guardedWall.vy;
    }

    // Only one brick is resolved per substep, per SPEC §9.
    for (var bi = 0; bi < bricks.length; bi++) {
      var b = bricks[bi];
      var ballLeft = ballX - BALL_RADIUS;
      var ballRight = ballX + BALL_RADIUS;
      var ballTop = ballY - BALL_RADIUS;
      var ballBottom = ballY + BALL_RADIUS;
      var overlapX = Math.min(ballRight, b.x + b.width) - Math.max(ballLeft, b.x);
      var overlapY = Math.min(ballBottom, b.y + b.height) - Math.max(ballTop, b.y);
      if (overlapX > 0 && overlapY > 0) {
        notePenetration('brick', Math.min(overlapX, overlapY));
        // Canonical pipeline (SPEC §9): reflect at V_pre -> guard (direction only,
        // still V_pre) -> rescale to V_post using the post-increment brick count.
        var brickBounce = window.BrickCollision.resolveBrickCollision(ballX, ballY, BALL_RADIUS, ballVx, ballVy, b);
        var guardedBrick = window.AngleGuard.enforceAngleGuard(brickBounce.vx, brickBounce.vy);
        bricks.splice(bi, 1);
        bricksClearedThisLevel++;

        if (bricks.length === 0) {
          state = 'levelClear';
          levelClearTimer = LEVEL_CLEAR_DURATION;
          updateButtonStates();
          return true;
        }

        var vPost = window.Speed.currentLevelSpeed(currentLevel, bricksClearedThisLevel);
        var rescaledBrick = rescaleVelocity(guardedBrick.vx, guardedBrick.vy, vPost);
        ballVx = rescaledBrick.vx;
        ballVy = rescaledBrick.vy;
        break;
      }
    }

    var paddleRect = { x: paddleX, y: PADDLE_Y, width: PADDLE_W, height: PADDLE_H };
    var paddleBallLeft = ballX - BALL_RADIUS;
    var paddleBallRight = ballX + BALL_RADIUS;
    var paddleBallTop = ballY - BALL_RADIUS;
    var paddleBallBottom = ballY + BALL_RADIUS;
    var paddleOverlapX = Math.min(paddleBallRight, paddleRect.x + paddleRect.width) - Math.max(paddleBallLeft, paddleRect.x);
    var paddleOverlapY = Math.min(paddleBallBottom, paddleRect.y + paddleRect.height) - Math.max(paddleBallTop, paddleRect.y);
    var overlapsPaddle = paddleOverlapX > 0 && paddleOverlapY > 0;

    if (overlapsPaddle && ballVy > 0) {
      notePenetration('paddle', Math.min(paddleOverlapX, paddleOverlapY));
      var axis = window.CollisionAxis.resolveRectCollisionAxis(ballX, ballY, BALL_RADIUS, paddleRect);
      if (axis === 'y') {
        var bounce = window.PaddleBounce.paddleTopBounce(ballX, paddleRect.x, paddleRect.width, Math.hypot(ballVx, ballVy));
        ballVx = bounce.vx;
        ballVy = bounce.vy;
        ballY = paddleRect.y - BALL_RADIUS;
      } else {
        var sideBounce = window.PaddleBounce.paddleSideBounce(ballVx, ballVy);
        ballVx = sideBounce.vx;
        ballVy = sideBounce.vy;
        ballX = ballX < paddleRect.x + paddleRect.width / 2 ? paddleRect.x - BALL_RADIUS : paddleRect.x + paddleRect.width + BALL_RADIUS;
      }
      var guardedPaddle = window.AngleGuard.enforceAngleGuard(ballVx, ballVy);
      ballVx = guardedPaddle.vx;
      ballVy = guardedPaddle.vy;
    }

    if (ballY - BALL_RADIUS > CANVAS_H) {
      setLives(lives - 1);
      if (lives > 0) {
        ballWaiting = true;
      } else {
        state = 'fail'; // overlay rendering added in Task 19
        updateButtonStates();
      }
      return true;
    }

    return false;
  }

  function update(dt) {
    frameCount++;

    paddleX = window.PaddleControl.computePaddleX({
      currentX: paddleX,
      heldKeys: heldKeys,
      pointerX: pointerX,
      dt: dt,
    });

    if (!ballWaiting) {
      var speed = Math.hypot(ballVx, ballVy);
      var n = window.Substep.computeSubstepCount(speed, dt, BALL_RADIUS);
      var subDt = dt / n;
      for (var s = 0; s < n; s++) {
        var shouldStop = stepBall(subDt);
        if (shouldStop || ballWaiting) break;
      }
    }
  }

  function render() {
    ctx.fillStyle = '#10121a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('frame: ' + frameCount, 12, 24);
    ctx.fillText('state: ' + state, 12, 44);

    for (var i = 0; i < bricks.length; i++) {
      var brick = bricks[i];
      ctx.fillStyle = COLOR_BRICK_ROW_PALETTE[brick.row % COLOR_BRICK_ROW_PALETTE.length];
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    }

    ctx.fillStyle = '#e5e7eb';
    ctx.strokeStyle = '#9ca3af';
    ctx.fillRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.strokeRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);

    var drawBallX = ballWaiting ? paddleX + PADDLE_W / 2 : ballX;
    var drawBallY = ballWaiting ? PADDLE_Y - BALL_RADIUS : ballY;
    ctx.fillStyle = '#f7f7f2';
    ctx.beginPath();
    ctx.arc(drawBallX, drawBallY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (state === 'paused') {
      drawOverlay('Paused', '#ffffff');
    } else if (state === 'levelClear') {
      drawOverlay('Level ' + (currentLevel + 1) + ' Cleared!', '#ffffff');
    } else if (state === 'victory') {
      drawOverlay('Victory', '#22c55e');
    } else if (state === 'fail') {
      drawOverlay('Fail', '#ef4444');
    }
  }

  function drawOverlay(text, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
  }

  function tick(now) {
    if (lastFrameTime === null) lastFrameTime = now;
    var rawDt = (now - lastFrameTime) / 1000;
    // Updating lastFrameTime on every tick — not only at state-transition moments —
    // is what satisfies SPEC §9's timer-reset rule: dt computed on the frame after any
    // idle/paused stretch is naturally small, since lastFrameTime was kept current
    // throughout, rather than needing an explicit reset hook per transition.
    lastFrameTime = now;
    var dt = window.Dt.clampDt(rawDt);

    if (state === 'playing') {
      update(dt);
    } else if (state === 'levelClear') {
      levelClearTimer -= dt;
      if (levelClearTimer <= 0) {
        advanceLevel();
      }
    }
    render();

    requestAnimationFrame(tick);
  }

  updateButtonStates();
  requestAnimationFrame(tick);
})();
