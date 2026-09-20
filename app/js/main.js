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
  // Placeholder until Task 15 wires the full currentLevelSpeed() formula (SPEC §8),
  // which depends on bricksClearedThisLevel state that doesn't exist yet.
  var BASE_SPEED = LEVELS[0].base;

  // States used so far: 'idle', 'playing', 'paused'. Later tasks add 'levelClear',
  // 'fail', 'victory' (SPEC §2) — this state variable and updateButtonStates() are
  // written to extend to those without changing this shape.
  var state = 'idle';
  var frameCount = 0;
  var lastFrameTime = null;

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

  function setLives(n) {
    lives = n;
    livesEl.textContent = 'Lives: ' + lives;
  }

  function launchBall() {
    if (state !== 'playing' || !ballWaiting) return;
    ballX = paddleX + PADDLE_W / 2;
    ballY = PADDLE_Y - BALL_RADIUS;
    var v = window.Launch.generateLaunchVelocity(BASE_SPEED, Math.random);
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

  function update(dt) {
    frameCount++;

    paddleX = window.PaddleControl.computePaddleX({
      currentX: paddleX,
      heldKeys: heldKeys,
      pointerX: pointerX,
      dt: dt,
    });

    if (!ballWaiting) {
      ballX += ballVx * dt;
      ballY += ballVy * dt;

      var reflected = window.Walls.reflectOffBoundaries(ballX, ballY, ballVx, ballVy, BALL_RADIUS, CANVAS_W);
      ballX = reflected.x;
      ballY = reflected.y;
      ballVx = reflected.vx;
      ballVy = reflected.vy;
      if (reflected.hit.length > 0) {
        var guardedWall = window.AngleGuard.enforceAngleGuard(ballVx, ballVy);
        ballVx = guardedWall.vx;
        ballVy = guardedWall.vy;
      }

      // Only one brick is resolved per frame (matches SPEC §9's "only one brick per
      // substep" intent, ahead of Task 16's formal substepping).
      for (var bi = 0; bi < bricks.length; bi++) {
        var b = bricks[bi];
        var overlapsBrick =
          ballX + BALL_RADIUS > b.x &&
          ballX - BALL_RADIUS < b.x + b.width &&
          ballY + BALL_RADIUS > b.y &&
          ballY - BALL_RADIUS < b.y + b.height;
        if (overlapsBrick) {
          var brickBounce = window.BrickCollision.resolveBrickCollision(ballX, ballY, BALL_RADIUS, ballVx, ballVy, b);
          var guardedBrick = window.AngleGuard.enforceAngleGuard(brickBounce.vx, brickBounce.vy);
          ballVx = guardedBrick.vx;
          ballVy = guardedBrick.vy;
          bricks.splice(bi, 1);
          bricksClearedThisLevel++;
          break;
        }
      }

      var paddleRect = { x: paddleX, y: PADDLE_Y, width: PADDLE_W, height: PADDLE_H };
      var overlapsPaddle =
        ballX + BALL_RADIUS > paddleRect.x &&
        ballX - BALL_RADIUS < paddleRect.x + paddleRect.width &&
        ballY + BALL_RADIUS > paddleRect.y &&
        ballY - BALL_RADIUS < paddleRect.y + paddleRect.height;

      if (overlapsPaddle && ballVy > 0) {
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
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'left';
    }
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
    }
    render();

    requestAnimationFrame(tick);
  }

  updateButtonStates();
  requestAnimationFrame(tick);
})();
