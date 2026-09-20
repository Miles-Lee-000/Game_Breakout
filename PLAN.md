# Breakout — Build Plan

Reference: [SPEC.md](SPEC.md). Each task should be a small, independently verifiable
commit. Pure-logic functions live in plain JS with no DOM dependency so they're testable
with `node` directly; a `tests/` directory holds these alongside `app/index.html`, and
`node tests/run-all.js` must run every test file and pass in full (Task 21).

> **Revision note:** renumbered and updated to fix issues an independent review found in
> the previous version — see inline notes marked **(fix)**. No game code has been
> written yet.

- [ ] **1. Scaffold `app/index.html`**
  Static HTML/CSS: fixed 480×720 `<canvas>`, HUD showing `Lives: 3` / `Level 1 / 3`, and
  Start/Pause/Restart buttons. No game logic yet.
  *Deliverable:* page loads in a browser, canvas and HUD are visible and correctly
  positioned, buttons are present (no-ops for now).

- [ ] **2. Responsive canvas scaling + coordinate mapping**
  Implement the CSS scale-to-fit behavior from SPEC §10, and extract
  `mapPointerToCanvas(clientX, clientY, canvasRect, w, h)` as a pure function taking a
  plain `{left, top, width, height}` rect (no live DOM read inside the function itself).
  **(fix)** the original plan only had a manual visual check for this; that's no longer
  the primary verification.
  *Deliverable:* unit tests assert exact `{x, y}` output for fixed rect/point fixtures
  at several scale factors (scaled up, scaled down, letterboxed with nonzero offset).
  Manual check (secondary): resizing the window / viewing at a narrow width keeps the
  aspect ratio correct with no distortion.

- [ ] **3. Game loop skeleton + Start/Pause + frame timing**
  `requestAnimationFrame` loop. Implement `clampDt(rawDt)` (clamps to `MAX_DT`, SPEC §9)
  as a pure function and use it for every frame. Implement the timer-reset rule: reset
  `lastFrameTime` on every `idle → playing` and `paused → playing` transition. Start
  transitions `idle → playing`; Pause toggles `playing ⇄ paused`. **(fix)** both buttons
  are now no-ops (and rendered disabled) outside their active states, per SPEC §2's
  button-availability table — the original plan left Start's behavior outside `idle`
  undefined.
  *Deliverable:* unit test for `clampDt` (values above `MAX_DT` clamp exactly to it,
  values below pass through). Manual: a visible on-canvas frame counter confirms the
  loop runs after Start, freezes on Pause, resumes after Pause again, and that pressing
  Start again while already `playing` (or Pause while `idle`) does nothing and the
  buttons appear disabled.

- [ ] **4. Paddle: rendering + keyboard control**
  Draw the paddle at `PADDLE_Y`. Track a `heldKeys` set via `keydown`(add)/`keyup`
  (remove) for `ArrowLeft`/`ArrowRight`/`A`/`D`; each frame, if non-empty, move the
  paddle at `PADDLE_KEY_SPEED * dt`, clamped to `[0, CANVAS_W - PADDLE_W]`.
  *Deliverable:* holding a key moves the paddle smoothly at the specified speed; holding
  it against either edge stops the paddle exactly at the boundary without exceeding it.

- [ ] **5. Paddle: mouse + touch control + input arbitration**
  Add `mousemove`/`touchstart`/`touchmove` handlers (using the coordinate mapping from
  Task 2) that record the latest pointer x. Implement
  `computePaddleX({ currentX, heldKeys, pointerX, dt })` per SPEC §4: keyboard wins
  whenever `heldKeys` is non-empty, pointer position drives the paddle only when it's
  empty. **(fix)** this replaces the original plan's event-ordering-based "whichever
  fired last wins" rule, which silently depended on OS key-repeat timing.
  *Deliverable:* unit tests for `computePaddleX` covering: keys held (pointer ignored,
  moves by keyboard speed), no keys held (snaps to pointer), and edge clamping in both
  modes. Manual: moving the mouse drags the paddle 1:1 when no key is held; pressing and
  holding an arrow key while moving the mouse keeps the paddle under keyboard control
  until the key is released.

- [ ] **6. Ball: waiting-on-paddle state + rendering**
  Draw the ball resting on top of the paddle, tracking paddle x every frame while no
  level is in progress toward launch.
  *Deliverable:* ball visibly follows the paddle left/right before launch, staying
  centered on top of it.

- [ ] **7. Seeded RNG utility + ball launch**
  Implement the injectable `RNG` type from SPEC §5 (production: `Math.random`-backed;
  tests: a small seeded PRNG such as mulberry32) and `generateLaunchVelocity(speed, rng)`
  per SPEC §6. **(fix)** the original plan tested launch angle by asserting output
  "varies" across repeated `Math.random()`-based calls — an inherently flaky,
  non-deterministic test; this version tests exact seeded output instead.
  *Deliverable:* unit tests assert the **exact** `{vx, vy}` for at least two fixed seeds
  (one giving each sign), and that `hypot(vx, vy) === speed` in both cases. Manual:
  clicking while the ball waits on the paddle launches it upward at a visibly varying
  angle across repeated plays (non-blocking sanity check only).

- [ ] **8. Wall & ceiling collisions**
  Implement reflection with the exact clamp targets from SPEC §9: `ball.x = r` (left),
  `ball.x = CANVAS_W - r` (right), `ball.y = r` (ceiling). **(fix)** the original plan
  said "clamp to the boundary" without stating these exact target values. No substepping
  yet (Task 16).
  *Deliverable:* unit test asserting each wall/ceiling collision produces exactly these
  clamp positions given a ball placed just past the boundary. Manual: launch the ball
  repeatedly and confirm it bounces off all three edges with no visible
  sinking/sticking, at base speed.

- [ ] **9. Ball falls below paddle → lose life**
  Detect `ball.y - r > CANVAS_H`; decrement lives, reset ball to waiting-on-paddle if
  lives remain.
  *Deliverable:* letting the ball fall decrements the `Lives` HUD and resets the ball to
  the paddle; repeating this down to 0 lives is verified in Task 19's Fail screen.

- [ ] **10. Paddle bounce formula (top hit + side hit)**
  Implement `paddleBounceVelocity(relativeIntersectX, speed)` (top-hit case) per SPEC §9,
  **plus** the paddle side-hit case using the same minimum-penetration-axis test as
  bricks (invert `vx`, keep `vy`'s sign). **(fix)** the original plan only defined the
  top-edge case, leaving a fast shallow-angle side-clip completely unaddressed.
  *Deliverable:* unit tests: center hit → angle ≈ 0° (before the angle guard from Task
  14 is applied); full-left/-right hit → angle ≈ ∓60°; output speed magnitude equals
  input for all cases; a side-hit fixture (ball approaching from the side with smaller
  horizontal penetration) inverts `vx` and leaves `vy`'s sign untouched. Manual: hitting
  the paddle at center/left/right sends the ball straight/left/right; clipping the
  paddle's side at a shallow angle bounces it rather than passing through.

- [ ] **11. Brick data model + layout generation**
  Implement `generateBrickLayout(rows, cols, fillPct, rng)` per SPEC §7 using the RNG
  utility from Task 7; wire level 1's config into it at level start. **(fix)** now takes
  an injected `rng` for deterministic testing, same rationale as Task 7.
  *Deliverable:* unit tests: with a fixed seed, the exact set of returned cells matches
  a recorded expectation; separately, returned count exactly matches
  `round(rows*cols*fillPct)` for all three levels' configs, all rects lie within canvas
  bounds, and there are no duplicate cells.

- [ ] **12. Brick rendering**
  Draw all live bricks from the generated layout, colored by row per
  `COLOR_BRICK_ROW_PALETTE` (SPEC §3).
  *Deliverable:* level 1's ~17 bricks render in a plausible-looking randomized grid near
  the top of the canvas, matching the configured rows/cols/margins and row coloring.

- [ ] **13. Ball-brick collision + removal**
  Implement `resolveBrickCollision(ball, brick)` axis-selection per SPEC §9, remove the
  hit brick, increment `bricksClearedThisLevel`.
  *Deliverable:* unit tests with controlled fixtures confirm horizontal-approach hits
  invert `vx` and vertical-approach hits invert `vy`. Manual check: hitting a brick from
  each of the four sides removes it and reflects the ball plausibly (per the documented
  corner-case limitation in SPEC §9, exact corner behavior is not a pass/fail criterion).

- [ ] **14. Degenerate-angle guard (fixed)**
  Implement the corrected `enforceAngleGuard(vx, vy)` from SPEC §9, with the deterministic
  `vx === 0 → sx = 1` / `vy === 0 → sy = -1` tie-breaks, and apply it after every
  reflection (wall, ceiling, paddle, brick). **(fix)** this is the critical bug the
  review found: the original formula's `Math.sign(vx)` returned `0` for an exactly
  dead-center paddle hit, silently failing to inject any horizontal component and
  letting the ball bounce perfectly vertically forever.
  *Deliverable:* unit tests **must include the regression case**
  `enforceAngleGuard(0, -300)` → asserts `vx > 0` and the resulting angle from vertical
  equals exactly `MIN_ANGLE_FROM_VERTICAL_DEG`, not the broken `vx === 0`. Also test
  near-horizontal input clamped to `MAX_ANGLE_FROM_VERTICAL_DEG`, and confirm speed and
  `vy`'s sign are preserved in all cases. Manual: repeatedly parking the paddle
  dead-center under the ball never produces a permanently vertical bounce.

- [ ] **15. Speed-up rule + canonical collision pipeline ordering**
  Implement `currentLevelSpeed(levelIndex, bricksCleared)` per SPEC §8, and wire the
  three-step pipeline from SPEC §9 (reflect at `V_pre` → guard direction only → rescale
  to `V_post` on brick hits only) into the collision handler. **(fix)** the original plan
  described speed rescaling and the angle guard in separate places with no stated order;
  this task now makes the ordering explicit and tests it end-to-end.
  *Deliverable:* unit tests for `currentLevelSpeed` matching the formula exactly at 0
  bricks, a mid-count, and confirming the cap holds for counts far beyond a level's
  total. **Pipeline test:** a brick-hit fixture asserts the resulting velocity's
  direction matches `enforceAngleGuard`'s output computed at the pre-collision speed,
  and its magnitude equals exactly the post-increment `currentLevelSpeed()` — verifying
  reflect → guard → rescale as one ordered pipeline, not each formula in isolation.
  Manual: ball visibly speeds up as bricks clear and levels off near the cap.

- [ ] **16. Substepped collision (anti-tunneling) + penetration instrumentation**
  Wrap ball movement in the substepping scheme from SPEC §9 (using the already-clamped
  `dt` from Task 3) so each substep's displacement never exceeds `BALL_RADIUS` before a
  collision check. Add a debug-mode instrumentation hook that logs the maximum observed
  penetration depth per collision (wall/ceiling/paddle/brick) during a session.
  **(fix)** the instrumentation is new — it turns Task 22's "no visible tunneling" check
  from a subjective impression into a number that can be compared against
  `MAX_ALLOWED_PENETRATION_PX`.
  *Deliverable:* unit test on the substep-count math (`N = ceil(|v|*dt/BALL_RADIUS)`)
  for representative speed/dt pairs, including the clamped `MAX_DT` case. Manual: at
  simulated level-3 max speed (540 px/s) with a throttled/low frame rate (devtools CPU
  throttling), the ball still collides with a thin paddle/brick rather than passing
  through, and the logged max penetration for the session is recorded for Task 22.

- [ ] **17. Level clear + level transition**
  Detect `bricksRemaining === 0`, show the `levelClear` overlay for 1s, then advance to
  the next level per SPEC §10 (new layout, reset ball/paddle, new base speed), applying
  the Task 3 timer-reset rule when the next level's simulation begins.
  *Deliverable:* clearing all of level 1's bricks (can temporarily reduce brick count for
  faster manual testing) shows the transition and loads level 2 with its own
  rows/cols/fillPct and a visibly faster base speed, with no dt-spike/jump in ball
  position on the frame simulation resumes.

- [ ] **18. Victory screen**
  Clearing level 3 enters `victory` and stops the loop; render the overlay per SPEC §2/§3
  (`COLOR_VICTORY_TEXT`, `FONT_OVERLAY_HEADLINE`), with the HUD behind it still showing
  `Level 3 / 3` and remaining lives.
  *Deliverable:* manually clearing all 3 levels in sequence ends on a "Victory" overlay
  in the specified color/font, with the loop stopped (paddle/ball no longer respond) and
  the HUD still visible behind it.

- [ ] **19. Fail screen**
  Reaching 0 lives enters `fail` and stops the loop (completes Task 9); render the
  overlay per SPEC §2/§3 (`COLOR_FAIL_TEXT`), HUD behind it left showing the final level
  and `Lives: 0`. **(fix)** clarifies the original's ambiguous "final level reached and
  lives" wording — no extra text is added to the overlay itself beyond "Fail".
  *Deliverable:* manually losing all 3 lives ends on a "Fail" overlay in the specified
  color/font, with the loop stopped and the existing HUD showing `Lives: 0`.

- [ ] **20. Restart (full reset)**
  Wire the Restart button to reset to level 1 / 3 lives / base speed / a fresh level-1
  layout from any state, per SPEC §10, applying the Task 3 timer-reset rule so a
  subsequent Start doesn't inherit stale elapsed time.
  *Deliverable:* pressing Restart from `paused`, `fail`, and `victory` each correctly
  returns to a clean `idle` level-1 state, and the first frame after the next Start
  doesn't show a dt-spike.

- [ ] **21. Full automated regression run**
  **(new — fix)** the original plan never re-verified all previously-written unit tests
  together. Create `tests/run-all.js` that runs every `*.test.js` file added in Tasks
  2–16 and reports a single pass/fail summary.
  *Deliverable:* `node tests/run-all.js` exits 0 with every individual test listed as
  passing; this command is run (and must pass) before Task 22 begins and again before
  calling the game done.

- [ ] **22. Cross-device pass**
  Run the full manual checklist from SPEC §11 on desktop (keyboard + mouse) and a touch
  device or emulator, at a few window sizes. **(fix)** items that were previously
  subjective ("no visible tunneling", "visibly increases") now have objective criteria:
  the Task 16 penetration log must show a max value `≤ MAX_ALLOWED_PENETRATION_PX`, and
  the primary speed-up verification is the automated pipeline test from Task 15 (this
  pass only double-checks it's visible, non-blocking).
  *Deliverable:* checklist items 1–11 from SPEC §11 all pass, including the numeric
  penetration-log check; note and fix any failures before calling the game done.

- [ ] **23. Visual polish**
  Apply `COLOR_*`/`FONT_*` constants (SPEC §3) to HUD, bricks, ball, paddle, and
  overlays. **(fix)** the original task had no concrete target to check against; now it
  does.
  *Deliverable:* using browser devtools' computed-style/color picker, every rendered
  color and font matches the exact `COLOR_*`/`FONT_*` constant it's supposed to, at both
  a typical desktop size and a phone-sized viewport — not a subjective "looks good."
