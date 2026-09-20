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
  // Placeholder until Task 15 wires the full currentLevelSpeed() formula (SPEC §8),
  // which depends on level/bricksClearedThisLevel state that doesn't exist yet.
  var BASE_SPEED = 300;

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
