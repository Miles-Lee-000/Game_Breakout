# Breakout — Specification

Single-page game at `app/index.html` (HTML + CSS + vanilla JS, no build step, no external
dependencies). The repository root stays free for a separate project page.

> **Revision note:** this version fixes issues raised in an independent review (broken
> degenerate-angle guard for exact-vertical hits, unbounded delta-time, ambiguous
> collision/speed ordering, undefined Start behavior outside `idle`, unreliable
> keyboard/mouse arbitration, non-deterministic RNG-based tests, unstated clamp targets,
> missing visual constants, undefined paddle side-hit case, and unfalsifiable manual
> test criteria). No game code has been written yet.

## 1. What it does

A classic Breakout clone: the player moves a paddle horizontally along the bottom of the
screen to keep a bouncing ball alive, breaking bricks arranged near the top. There are
3 levels of increasing difficulty and 3 lives. Clearing all bricks in level 3 wins the
game ("Victory"); running out of lives at any point ends it ("Fail").

## 2. What the player sees

**Layout:** a fixed-aspect-ratio canvas, **480×720** logical pixels (portrait), centered
on the page and scaled with CSS to fit the viewport (letterboxed if the window's aspect
ratio doesn't match — see §10). Above or beside the canvas, a HUD shows:

- **Lives:** e.g. `Lives: 3`
- **Level:** e.g. `Level 1 / 3`
- **Controls:** `Start`, `Pause`, `Restart` buttons

**Screens / states**, all rendered on top of or instead of the canvas contents:

| State | What's shown |
|---|---|
| `idle` (before first Start, or after Restart) | Canvas with paddle centered, ball resting on paddle, bricks for level 1 already visible, dimmed with a "Press Start" prompt |
| `playing`, ball waiting | Paddle movable, ball sits on top of paddle and tracks its x position; prompt "Click / tap to launch" |
| `playing`, ball in motion | Normal gameplay |
| `paused` | Gameplay frozen, semi-transparent "Paused" overlay |
| `levelClear` | Brief overlay "Level X Cleared!" for 1 second, then auto-advances |
| `fail` | Overlay text **"Fail"** (color `COLOR_FAIL_TEXT`); the persistent HUD behind the overlay is left showing the level the player was on and `Lives: 0` — no separate life/level readout is added to the overlay itself |
| `victory` | Overlay text **"Victory"** (color `COLOR_VICTORY_TEXT`); the persistent HUD behind the overlay shows `Level 3 / 3` and the lives remaining |

**Button availability by state** (fixes the original spec's silence on `Start`):

- **Start**: active only in `idle`; begins `playing`. In every other state it is a no-op
  and rendered visually disabled (grayed out).
- **Pause**: active only in `playing`/`paused`, toggling between them. In every other
  state it is a no-op and rendered visually disabled.
- **Restart**: always active in every state; performs a full reset — back to level 1,
  3 lives, base speed, a freshly randomized level-1 layout — and returns to `idle`.

**Visual style** (concrete constants so "polish" work is checkable, not subjective —
see §3 for the exact values): dark flat background, light paddle/ball, bricks colored by
row from a fixed 6-color palette that repeats if a level has more rows than colors, HUD
text and overlay headlines in a plain system sans-serif font at fixed sizes.

## 3. Constants

```
CANVAS_W = 480, CANVAS_H = 720

PADDLE_W = 90, PADDLE_H = 14
PADDLE_Y = CANVAS_H - 40                  // top edge of paddle
PADDLE_KEY_SPEED = 400                    // px/s while a movement key is held

BALL_RADIUS = 8

LIVES_START = 3
TOTAL_LEVELS = 3

// Per-level base speed (px/s) and brick grid
LEVELS = [
  { base: 300, rows: 4, cols: 7, fillPct: 0.60 },  // level 1: 28 cells, 17 bricks
  { base: 330, rows: 5, cols: 8, fillPct: 0.70 },  // level 2: 40 cells, 28 bricks
  { base: 360, rows: 6, cols: 9, fillPct: 0.80 },  // level 3: 54 cells, 43 bricks
]

SPEED_PER_BRICK = 0.02                    // +2% of level base speed per brick cleared
SPEED_CAP_MULT  = 1.5                     // never exceeds 150% of level base speed

BRICK_H = 20, BRICK_GAP = 4, BRICK_MARGIN_X = 10, BRICK_TOP_Y = 80

MIN_ANGLE_FROM_VERTICAL_DEG   = 8         // ball may never get closer to purely vertical
MAX_ANGLE_FROM_VERTICAL_DEG   = 82        // ...or purely horizontal, than this
LAUNCH_MIN_ANGLE_DEG = 15                 // initial launch angle range from vertical
LAUNCH_MAX_ANGLE_DEG = 50
PADDLE_MAX_BOUNCE_ANGLE_DEG = 60          // max angle from vertical off paddle edges

MAX_DT = 0.05                             // seconds; clamp on every physics frame (see §9)
MAX_ALLOWED_PENETRATION_PX = BALL_RADIUS  // 8px; objective anti-tunneling acceptance threshold (see §11) —
                                           // this is the actual bound the substep scheme in §9 guarantees
                                           // (no substep moves more than BALL_RADIUS, so penetration can
                                           // never reach or exceed it), not an arbitrary smaller number

// Visual palette (concrete, so "polish" tasks have a falsifiable target)
COLOR_BACKGROUND       = '#10121a'
COLOR_PADDLE           = '#e5e7eb'
COLOR_PADDLE_BORDER    = '#9ca3af'
COLOR_BALL             = '#f7f7f2'
COLOR_BRICK_ROW_PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']
                                           // cycles by (row index mod palette length)
COLOR_HUD_TEXT         = '#e5e7eb'
COLOR_OVERLAY_BACKDROP = 'rgba(0,0,0,0.6)'
COLOR_OVERLAY_TEXT     = '#ffffff'
COLOR_FAIL_TEXT        = '#ef4444'
COLOR_VICTORY_TEXT     = '#22c55e'
FONT_HUD               = '16px system-ui, sans-serif'
FONT_OVERLAY_HEADLINE  = 'bold 32px system-ui, sans-serif'
```

Target brick count per level = `round(rows * cols * fillPct)`, giving 17 / 28 / 43 bricks
for levels 1/2/3 respectively (see §7 for exact placement).

## 4. Controls

Paddle x is always clamped to `[0, CANVAS_W - PADDLE_W]`.

- **Keyboard:** `ArrowLeft`/`A` and `ArrowRight`/`D` move the paddle at
  `PADDLE_KEY_SPEED` px/s while held, using deltatime-scaled movement (not an instant
  jump).
- **Mouse:** while active (see arbitration rule below), paddle center x snaps to the
  cursor's x on `mousemove` over the canvas.
- **Touch:** while active, paddle center x snaps to the touch point x on
  `touchstart`/`touchmove` over the canvas.

**Input arbitration (fixes the original spec's reliance on OS key-repeat timing):**
Keyboard always takes priority over pointer position, decided fresh every frame rather
than by racing events:

- A set of "currently held" movement keys (`heldKeys`) is maintained via `keydown`
  (add) / `keyup` (remove). This does **not** depend on the browser re-firing `keydown`
  for a held key — it only depends on one `keydown` and one eventual `keyup`, which every
  browser/OS delivers reliably.
- Each frame: **if `heldKeys` is non-empty**, move the paddle by keyboard velocity for
  that frame and ignore any pointer position. **Only when `heldKeys` is empty** does the
  most recent pointer position (from `mousemove`/`touchmove`) drive the paddle directly.
- This is expressed as a pure, unit-testable function:
  `computePaddleX({ currentX, heldKeys, pointerX, dt }) → newX`.

## 5. Randomness (seeded, for deterministic tests)

All gameplay randomness — initial launch direction and the brick-layout shuffle — is
drawn from a single injectable source rather than scattered `Math.random()` calls:

```
type RNG = () => number   // returns a float in [0, 1)
```

Production code wires a default RNG backed by `Math.random`. The pure functions that
need randomness (`generateLaunchVelocity`, `generateBrickLayout`) take an `rng: RNG`
argument instead of calling `Math.random()` internally. Unit tests pass a small seeded
PRNG (e.g. a one-line mulberry32/xorshift) with fixed seeds, so tests assert **exact**
expected outputs for a given seed instead of statistical properties over many runs —
this removes the flakiness of asserting behavior merely "varies" across calls. A
separate, explicitly non-blocking sanity check may still exercise the default
`Math.random`-backed path manually, but no automated test's pass/fail depends on it.

## 6. Launch

While waiting to launch, the ball sits centered on top of the paddle:
`ball.x = paddle.x + PADDLE_W/2`, `ball.y = PADDLE_Y - BALL_RADIUS`, and tracks the
paddle's x every frame.

On click/tap in this state:

```
generateLaunchVelocity(speed, rng):
  sign = rng() < 0.5 ? -1 : 1
  θ    = sign * (LAUNCH_MIN_ANGLE_DEG + rng() * (LAUNCH_MAX_ANGLE_DEG - LAUNCH_MIN_ANGLE_DEG))
                                                            // degrees from vertical, ±[15°,50°]
  vx = speed * sin(radians(θ))
  vy = -speed * cos(radians(θ))                            // negative = upward
  return { vx, vy }
```

`speed` is `currentLevelSpeed()` (§8) at the moment of launch. This guarantees the
initial direction is always upward and never near-vertical or near-horizontal.

## 7. Brick layout generation

For a level with `rows`, `cols`, `fillPct`:

```
brickWidth = (CANVAS_W - 2*BRICK_MARGIN_X - (cols-1)*BRICK_GAP) / cols

cell(row, col).x = BRICK_MARGIN_X + col * (brickWidth + BRICK_GAP)
cell(row, col).y = BRICK_TOP_Y   + row * (BRICK_H     + BRICK_GAP)

generateBrickLayout(rows, cols, fillPct, rng):
  targetCount = round(rows * cols * fillPct)
  cells = all (row, col) pairs, rows*cols total
  shuffle(cells, rng)          // Fisher–Yates, powered by the injected rng (§5)
  return first targetCount entries of shuffled cells
```

This yields a **fixed, testable brick count per level** (17 / 28 / 43) with a randomized
arrangement each time the level loads — satisfying "placed randomly" while keeping
difficulty (brick count) deterministic and easy to assert in tests.

## 8. Speed-up rule (approved)

Ball speed is per-level and depends only on how many bricks have been cleared **in the
current level**:

```
currentLevelSpeed() = LEVELS[level].base * min(1 + SPEED_PER_BRICK * bricksClearedThisLevel, SPEED_CAP_MULT)
```

- +2% of the level's base speed per brick cleared, capped at 150% of that base.
- Level base speeds themselves rise slightly across levels: 300 → 330 → 360 px/s
  (level 2 starts 10% above level 1's base, level 3 20% above).
- Effective max speeds: level 1 = 450 px/s, level 2 = 495 px/s, level 3 = 540 px/s —
  bounded so play never becomes uncontrollable, while still ramping up within a level
  and across levels.
- Speed resets to the new level's base at the start of each level (`bricksClearedThisLevel`
  resets to 0).
- **Exactly when and how this is combined with a bounce's direction change is defined by
  the collision pipeline in §9** — the ordering was ambiguous in the original draft and
  is now pinned down there.

## 9. Collision & reflection rules

The game loop uses `requestAnimationFrame`. Each frame's raw elapsed time is clamped
before use: `dt = min(rawDt, MAX_DT)` (50 ms). This bounds both the maximum single-frame
movement and the substep count below, so a backgrounded tab, OS sleep, or a paused
debugger can never produce an oversized physics step or a substep burst on resume.

**Timer reset rule:** `lastFrameTime` is reset to "now" (i.e. the next computed `dt` is
effectively 0) at the exact moment the game transitions into actively-simulating
`playing` — specifically: `idle → playing` (Start), `paused → playing` (Pause toggled
off), and the instant the 1-second `levelClear` overlay ends and the next level's
simulation begins. Without this, the wall-clock time spent paused/transitioning would
otherwise be fed into physics as one large `dt` on the very next frame.

**Anti-tunneling (substepping):** each frame, if `|v| * dt` exceeds `BALL_RADIUS`, the
frame's motion is split into `N = ceil(|v| * dt / BALL_RADIUS)` substeps, each moved and
collision-checked (against walls, ceiling, the paddle, and bricks) independently, so the
ball can never cross any of them without a collision being detected, regardless of frame
rate or speed. Because `dt` is already clamped to `MAX_DT`, `N` itself is bounded (at
most `ceil(SPEED_CAP_MULT * 360 * MAX_DT / BALL_RADIUS)` ≈ 4 substeps at level 3's max
speed).

**Canonical per-collision pipeline** (fixes the original draft's ambiguity between the
speed-up formula and the angle guard): every wall/ceiling/paddle/brick collision is
resolved in this fixed order:

1. **Reflect:** compute the new direction at the ball's speed *before* this collision
   (`V_pre` — for a brick or paddle/wall/ceiling hit this is simply the ball's current
   speed at the moment of contact).
2. **Guard:** apply the degenerate-angle guard (below) to that reflected `(vx, vy)`,
   still at magnitude `V_pre`. This step only ever changes *direction*, never magnitude.
3. **Rescale (bricks only):** if the collision removed a brick, recompute the target
   speed `V_post = currentLevelSpeed()` using the just-incremented
   `bricksClearedThisLevel`, then rescale the guarded vector from step 2 to magnitude
   `V_post` (unit direction unchanged). For wall/ceiling/paddle collisions, `V_post =
   V_pre` — those never change speed.

**Left/right walls** (`ball.x - r <= 0` or `ball.x + r >= CANVAS_W`): invert `vx`, then
clamp `ball.x` to the exact boundary — **`r` on the left, `CANVAS_W - r` on the right**
— so it can't sink past it.

**Ceiling** (`ball.y - r <= 0`): invert `vy`, then clamp `ball.y` to exactly **`r`**.

**Paddle:** the paddle is checked every substep as an axis-aligned rectangle, using the
same minimum-penetration-axis test as bricks (§9 below):

- **Top hit** (vertical penetration is smaller — the common case, ball approaching from
  above with `vy > 0`):
  ```
  relativeIntersectX = clamp((ball.x - paddleCenterX) / (PADDLE_W / 2), -1, 1)
  angle = relativeIntersectX * PADDLE_MAX_BOUNCE_ANGLE_DEG     // degrees from vertical
  vx = V_pre * sin(radians(angle))
  vy = -V_pre * cos(radians(angle))
  ball.y = PADDLE_Y - r    // prevent sinking into the paddle
  ```
  Hitting dead center sends the ball toward straight up (then widened to
  `MIN_ANGLE_FROM_VERTICAL_DEG` by the guard in step 2 of the pipeline — see below);
  hitting the edges sends it up-and-left/right at up to 60° from vertical.
- **Side hit** (horizontal penetration is smaller — a fast, shallow-angle ball clipping
  the paddle's left/right edge; unaddressed in the original draft): treat like a wall —
  invert `vx`, leave `vy`'s sign unchanged — then continue through the guard step as
  normal. This prevents the ball passing through the side of the paddle undetected.

**Bricks:** for the brick the ball's swept path overlaps, use the minimum-translation
axis to decide the bounce: compare the ball's horizontal vs. vertical penetration into
the brick's bounding box at the moment of contact; the axis with the smaller penetration
is the one reflected (invert `vx` for a horizontal-side hit, `vy` for a top/bottom hit).
The brick is removed and `bricksClearedThisLevel += 1` (feeding step 3 of the pipeline
above). Only one brick is resolved per substep.

*Known limitation:* this rectangle-based minimum-penetration heuristic approximates true
circle-vs-rectangle collision (used identically for bricks and the paddle). On rare
shallow corner grazes it can pick a reflection axis a full circular-collision test
wouldn't. This is an accepted simplification for this project's scope: it never causes a
miss — the brick is still removed and the ball still reflects — only an occasional
imprecise bounce direction on true corner hits.

**Degenerate-angle guard** — corrected to actually work at exactly-vertical or
exactly-horizontal velocities, which the original formula silently failed to fix (the
critical bug an independent review found: `Math.sign(0) === 0` left a dead-center paddle
hit, or any bounce that lands exactly on `vx === 0`, permanently and perfectly vertical):

```
enforceAngleGuard(vx, vy):
  V   = hypot(vx, vy)
  phi = atan2(abs(vx), abs(vy))                 // angle from vertical, in [0°, 90°]
  if MIN_ANGLE_FROM_VERTICAL_DEG <= phi <= MAX_ANGLE_FROM_VERTICAL_DEG:
    return { vx, vy }                           // already fine, no change

  clampedPhi = clamp(phi, MIN_ANGLE_FROM_VERTICAL_DEG, MAX_ANGLE_FROM_VERTICAL_DEG)
  sx = (vx === 0) ? 1  : sign(vx)                // tie-break: default rightward
  sy = (vy === 0) ? -1 : sign(vy)                // tie-break: default upward (should not occur)

  return {
    vx: V * sin(radians(clampedPhi)) * sx,
    vy: V * cos(radians(clampedPhi)) * sy,
  }
```

The `vx === 0 → sx = 1` and `vy === 0 → sy = -1` tie-breaks are deterministic (no RNG
involved) and are the fix: a dead-center paddle hit now reliably deflects at least
`MIN_ANGLE_FROM_VERTICAL_DEG` (8°) to the right rather than staying at exactly 0°. This
function is applied after *every* reflection (wall, ceiling, paddle, brick) per the
pipeline above, guaranteeing the ball never travels purely vertically or purely
horizontally for more than the instant of a single bounce — including the repeated
dead-center-paddle-parking case the review identified.

**Falling below the paddle** (`ball.y - r > CANVAS_H`): lose a life. If lives remain,
reset the ball to the waiting-on-paddle state (§6) and continue; if `lives === 0`, enter
the `fail` state and stop the loop.

## 10. Level & game state machine

- **Level clear**: when `bricksRemaining === 0` for the current level, enter `levelClear`
  for 1 second, then:
  - if `level < 3`: `level += 1`, generate that level's brick layout (§7), reset
    `bricksClearedThisLevel = 0`, reset the ball to waiting-on-paddle at the current
    paddle position, resume `playing` (applying the timer-reset rule from §9).
  - if `level === 3`: enter `victory`, stop the loop.
- **Restart**: from any state, reset to level 1, `lives = LIVES_START`, regenerate level
  1's layout, reset ball/paddle to initial positions, return to `idle` (also applying the
  timer-reset rule from §9, so a subsequent Start doesn't inherit stale elapsed time).
- **Responsive scaling**: the canvas element is drawn at the fixed 480×720 logical
  resolution and scaled via CSS (`width`/`height` or a `transform: scale()`) to fit the
  viewport while preserving aspect ratio; all game-object math stays in the 480×720
  coordinate space regardless of display size. Pointer/touch coordinates are mapped from
  screen space back into this logical space via a pure function
  `mapPointerToCanvas(clientX, clientY, canvasRect, CANVAS_W, CANVAS_H) → {x, y}` before
  use, where `canvasRect` is a plain `{left, top, width, height}` object (so the function
  itself has no DOM dependency and is unit-testable — see §11).

## 11. Testing strategy

**Automated unit tests** (plain JS, no framework, runnable with `node` since all of the
logic below is extracted into pure functions with no DOM dependency; a single command,
e.g. `node tests/run-all.js`, runs every test file and must pass in full before any task
is considered done):

- `mapPointerToCanvas(clientX, clientY, canvasRect, w, h)` — fixed input rects/points at
  several scale factors (scaled up, scaled down, letterboxed with a nonzero offset) each
  assert an exact expected `{x, y}`.
- `computePaddleX({ currentX, heldKeys, pointerX, dt })` — asserts: keys held → pointer
  ignored, moves by `PADDLE_KEY_SPEED * dt`; no keys held → snaps to `pointerX`; neither
  → unchanged; all cases also assert the `[0, CANVAS_W - PADDLE_W]` clamp at both edges.
- `clampDt(rawDt)` — asserts values above `MAX_DT` are clamped to exactly `MAX_DT` and
  values below pass through unchanged.
- `generateLaunchVelocity(speed, rng)` — with a fixed seeded `rng`, asserts the *exact*
  expected `{vx, vy}` for at least two different seeds (one producing each sign), and
  that `hypot(vx, vy) === speed` for both.
- `currentLevelSpeed(levelIndex, bricksCleared)` — matches the §8 formula exactly at
  `bricksCleared = 0`, at a mid-value, and confirms it never exceeds
  `base * SPEED_CAP_MULT` even for large `bricksCleared`.
- `generateBrickLayout(rows, cols, fillPct, rng)` — with a fixed seeded `rng`, asserts
  the *exact* expected set of cells for a given seed, and separately (unseeded, general
  property check) that the returned count always equals `round(rows*cols*fillPct)` for
  all three levels' configs, all rects lie within grid bounds, and there are no
  duplicate cells.
- `enforceAngleGuard(vx, vy)` — **must include the specific regression case the review
  flagged**: `enforceAngleGuard(0, -300)` (dead-center paddle hit) returns a vector with
  `vx > 0` and `phi === MIN_ANGLE_FROM_VERTICAL_DEG`, not `vx === 0`. Also covers
  near-horizontal input clamped to `MAX_ANGLE_FROM_VERTICAL_DEG`, and confirms speed
  (`hypot`) and the sign of `vy` are preserved in all cases.
- `resolveBrickCollision(ball, brick)` / paddle side-vs-top selection — axis-selection
  logic returns the expected reflected axis for controlled horizontal-approach,
  vertical-approach, and paddle-side-approach fixtures.
- **Pipeline ordering test** (covers §9's canonical pipeline end-to-end): a brick-hit
  fixture asserts the resulting velocity's *direction* equals `enforceAngleGuard`'s
  output computed at the pre-collision speed, and its *magnitude* equals exactly
  `currentLevelSpeed()` evaluated post-increment — i.e. it tests reflect → guard →
  rescale as one ordered pipeline, not the formula in isolation.

**Manual test checklist** (run in-browser, desktop + a touch device/emulator), with
objective pass/fail criteria wherever the original checklist relied on subjective
judgment:

1. Paddle never leaves `[0, CANVAS_W - PADDLE_W]` under keyboard, mouse, or touch input.
2. Mixing keyboard and mouse mid-game always yields keyboard control whenever any
   movement key is held, and pointer control the instant no key is held — no
   inconsistent or "stuck" behavior when switching between the two.
3. **Anti-tunneling, objective check:** run a debug build with penetration logging
   enabled (instrumented in Task 16) for a continuous 2-minute session covering wall,
   ceiling, paddle-top, paddle-side, and brick collisions at both base and capped
   (max) speed. The logged maximum penetration depth across the session must be
   `≤ MAX_ALLOWED_PENETRATION_PX` (`BALL_RADIUS`, 8px — the bound §9's substep scheme
   actually guarantees; empirically, typical penetration at 60fps is well under this,
   commonly 0-5px, since the bound is a worst case rather than a typical case).
4. Paddle hits at center/left-edge/right-edge produce visibly straight/left/right bounces
   matching the formula, and a dead-center hit is never perfectly vertical (confirms the
   angle-guard fix from §9 in the running game, not just in the unit test).
5. Every brick disappears on contact and the ball reflects off the correct side (verified
   against side-approach test cases: straight-on, from below, from the side).
6. Ball speed visibly increases as bricks clear within a level and plateaus at the cap;
   resets at each new level boundary. (Primary verification is the automated
   `currentLevelSpeed`/pipeline-ordering tests above; this manual pass is supplementary
   and non-blocking.)
7. Losing the ball decrements Lives and resets it to the paddle; reaching 0 lives shows
   "Fail" and stops the game.
8. Clearing all bricks in a level advances to the next with a new layout and higher base
   speed, with no dt/timing glitch on the transition (confirms the timer-reset rule);
   clearing level 3 shows "Victory".
9. Start/Pause/Restart behave exactly per the button-availability table in §2 in every
   reachable state, including Restart from `fail`/`victory`/`paused`, and Start/Pause
   being no-ops (and visibly disabled) outside their active states.
10. Resizing the browser window / rotating a phone keeps the canvas's aspect ratio and
    keeps pointer/touch coordinates correctly mapped to game coordinates (primary
    verification is the automated `mapPointerToCanvas` tests above).
11. **Visual polish, objective check:** using browser devtools' computed-style/color
    picker, confirm rendered colors and fonts for background, paddle, ball, bricks, HUD
    text, and overlays match the exact `COLOR_*`/`FONT_*` constants in §3, not a
    subjective "looks good."

## 12. Verification

Predictions made elsewhere in this spec, checked against the running game (not just
unit tests of the underlying formulas in isolation):

- **Paddle-edge bounce angle.** §9 predicts a hit at the paddle's extreme edge sends the
  ball off at exactly `PADDLE_MAX_BOUNCE_ANGLE_DEG` (60°) from vertical. **Confirmed by
  playtesting:** repeatedly steering the paddle so the ball only ever contacts its
  leftmost edge, sampled bounce angles (measured live from on-screen ball displacement
  between frames) landed at ~60° from vertical, matching the formula rather than
  drifting toward a shallower or steeper angle.
- **Level 1 speed cap.** §8 predicts level 1's ball speed plateaus at `450 px/s`
  (`300 × SPEED_CAP_MULT`) once enough bricks are cleared, never exceeding it. **Confirmed
  by playtesting:** clearing bricks continuously for a sustained session, measured live
  ball speed (via on-screen displacement over time) climbed from the ~300 px/s base and
  plateaued at ~450 px/s for the remainder of the session, not exceeding it beyond
  measurement noise.
