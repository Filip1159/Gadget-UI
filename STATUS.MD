# the-sneaky-spy (Frontend) - Status / Backlog

Code review snapshot of the frontend (2026-10-20, branch with uncommitted changes in `socket.service.ts`, `drawing.ts`, `robot-preview.*`). This is a worklist, not a changelog. Items are ordered by priority inside each section.

Companion list for the firmware: `C:\Users\fwisn\Documents\PlatformIO\Projects\Arduino Nano ESP32 OTA test\STATUS.MD`. Items tagged **[cross-repo]** need a change on both sides.

---

## Resolved (2026-10-20, `ng build` verified, not tested in a browser)

- 1.1 stop on release: `LongPressButton` has a `release` output; every direction button sends `STOP` on release/cancel/leave/destroy.
- 1.1 `LongPressButton`: now uses Pointer Events with a re-entry guard (no double-fire/leaked timers), `touch-action: none`, no context menu.
- 1.1 keyboard map: `s` -> `STOP`, key lowercased and unmapped keys ignored (handler is still commented out). Duplicate map removed from `control-panel.ts`.
- 1.1 `send()`: no longer throws; returns `false` and warns when the socket isn't open. (The UI still doesn't surface this, see 1.2.)

Still open in 1.1: keyboard throttle/keyup design (only relevant once the handler is re-enabled) and the 500ms repeat vs. firmware.


## Resolved, round 2 (`ng build` verified, not tested in a browser)

- 1.2 `SocketService` owns the connection: `App` calls `connect()` (idempotent), not `RobotPreview`.
- 1.2 reconnect with exponential backoff (0.5s to 10s), `status` signal (`connecting|open|closed`), `onerror` handled, red banner in `app.html` while not connected.
- 1.2 robot URL: `localStorage.robotUrl` overrides the default `ws://192.168.1.16:88`.
- 1.2 UI desync: on every (re)connect the preview resets `isMeasuring` and sends `MEASURE_STOP`; `isMeasuring` is now a signal.
- 1.3 repaint coalesced to one `requestAnimationFrame` per burst of frames; stale cones cleared on disconnect and on stop measuring.
- Hot-path `console.log`s removed from the socket service and preview; `messages$` subscription uses `takeUntilDestroyed`.

Not done (still open): the banner does not disable the control buttons; out-of-range rendering, HiDPI canvas, per-sensor staleness aging, hardcoded-IP UI field.


## Resolved, round 3 (`ng build` verified, not tested in a browser)

- 1.4 slider `SPEED` messages throttled to one per 100ms (leading + trailing, so the final value always goes out).
- 1.4 PID: values validated (finite, >= 0) before sending, Set PID disabled otherwise; button is `type="button"`; labels now match input ids.
- 1.4 icon buttons have `aria-label`s.
- Direction buttons are disabled while the socket is not open (STOP stays enabled).
- 1.3 canvas is HiDPI-aware (backing store scaled by `devicePixelRatio`, drawing code unchanged).

Not done: out-of-range rendering (cross-repo), per-sensor staleness aging, keyboard handler redesign, typed protocol layer, tests.



## Resolved, round 4 (`ng build` + `ng test` verified, not tested against the robot) [cross-repo]

- Batched frame: `parseSweep()` (`drawing.ts`) parses `MEASURE DIR=mm|OOR ...` atomically; a malformed frame or unknown sensor drops the whole frame, a valid one replaces the whole map.
- `OOR` is drawn as a dashed full-range outline instead of a fake 1000mm cone.
- Stale readings: the preview clears itself if no sweep arrives for 3s (plus the existing clear on disconnect / stop).
- Tests: removed the stale `app.spec.ts`, added `drawing.spec.ts` (3 parser tests, passing).
- `CLAUDE.md` protocol section updated. The old firmware frame format is no longer supported.

Not done: per-sensor (rather than whole-sweep) staleness, typed protocol layer, keyboard handler redesign, tests for `LongPressButton`/`SocketService`.



## Resolved, round 5 (`ng build` + `ng test` verified, 12 tests passing)

- Typed protocol layer: `src/protocol.ts` (`DriveDirection`, `SensorDirection`, `Command`, `encodeCommand`, `parseMessage`). `SocketService.send()` now takes a typed `Command`; `SocketService.robot$` emits only validated frames. Components no longer build or parse raw strings, and a typo in a direction is a compile error.
- Tests added: protocol (parser + encoder), `SocketService` (not-open handling, status, idempotent connect, backoff reconnect, frame filtering), `LongPressButton` (single press/release, no leaked timer on double start, destroy).

Not done: keyboard handler redesign (still commented out), per-sensor staleness, an `OnPush`/signals-input migration of the legacy `@Input/@Output` components, ESLint, robot-address UI field.


---

## 1. Bugs

### 1.1 Robot control (safety-relevant)

- **Releasing a direction button never stops the robot.** `longpress-button` only emits `press` repeatedly while held; `onPressEnd()` just cancels the timer and sends nothing. Only the dedicated stop button sends `STOP`. The firmware has no command timeout, so after you let go the robot keeps driving in the last direction. **[cross-repo]** Fix: emit a `release` output and send `STOP` on release (and on `mouseleave`/`touchcancel`/window blur), and add a firmware-side timeout as a backstop.
- **Keyboard steering sends commands the firmware will crash on.** `KEY_TO_DIRECTION` (`steering.ts`) maps `s` -> `'BRAKE'`, which the firmware doesn't know (valid is `STOP`). An unknown string triggers `std::map::at` in the firmware, which will most likely abort/reboot the robot. The handler is currently commented out, but enabling it as is would hit this. Also, `keyboardEvent.key` is case-sensitive: with Caps Lock/Shift, `W` is not in the map, so `socket.send(undefined)` sends the literal string `"undefined"`, which crashes the firmware the same way. Fix: lowercase the key, ignore unmapped keys, use `STOP`, and validate everything that goes to `send()` against a typed command union.
- **Keyboard design problems (if re-enabled):**
  - `throttleTime(500)` is leading-edge only, so pressing `w` then `a` within 500ms drops the `a`.
  - There is no `keyup` handling, so releasing a key doesn't stop (same issue as buttons).
  - Auto-repeat from holding a key is silently throttled.
  - `keydown` fires while typing in the PID inputs; the handler must ignore events targeting inputs.
- **`LongPressButton` double-fire / leak on touch devices.** It listens to both `touchstart` and `mousedown` (and `touchend`/`mouseup`) without `preventDefault`, so a tap emits `touchstart/touchend` and then the emulated `mousedown/mouseup`, i.e. two bursts of commands per tap. `onPressStart()` also has no re-entry guard: it overwrites `this.subscription` and `this.stop$` without ending the previous one, so a second start (overlapping touch + mouse, or a second finger) leaves the first timer bound to the *old* `stop$`, which nobody can reach anymore, and it keeps sending the command forever. `touchcancel` isn't handled either (e.g. system gesture, incoming call), so the timer never stops. Fix: switch to Pointer Events (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`) with `setPointerCapture`, guard re-entry, and make `touch-action: none` / `user-select: none` part of the component styles.
- **Repeat commands also reset the robot's PID.** The 500ms repeat while a button is held is received by the firmware as a new command each time, which resets both PID controllers (firmware STATUS 1.2), causing periodic speed ripple. **[cross-repo]** Fix on the frontend: send on direction *change* and use a slower heartbeat; fix in the firmware: don't reset when the direction is unchanged.
- **`send()` can throw or silently drop.** `SocketService.send()` calls `this.socket.send()` on a `socket!` that is undefined until `connect()` runs, and throws `InvalidStateError` while the socket is `CONNECTING`. On `CLOSING`/`CLOSED` it silently discards the message. A click before the connection opens (or after it drops) either throws in an event handler or does nothing with no UI feedback, which is especially bad for a `STOP`. Fix: check `readyState`, return a boolean/emit an error state, and show it in the UI.

### 1.2 Connection

- **`SocketService.connect()` is called from `RobotPreview`'s constructor.** `Steering` depends on the same service but never connects it, so the app only works because `RobotPreview` happens to be rendered. Connection ownership belongs to the service (or an `APP_INITIALIZER`/root component), not a presentation component. Constructors shouldn't have side effects either.
- **No reconnect, no connection status, no `onerror`.** `onclose` only logs. After a drop (robot reboot, WiFi blip, firmware crash from a bad command) the page must be reloaded; the UI gives no indication of this, and the buttons look fully functional. Fix: expose a `status` signal (`connecting|open|closed`), reconnect with backoff, and disable/flag the controls when not open.
- **Hardcoded `ws://192.168.1.16:88`.** If the robot's IP changes it silently never connects (the firmware STATUS suggests mDNS `robot.local`). Move it to an environment/config file (and/or a text field persisted in `localStorage`). Also note `ws://` from an `https://` page is blocked as mixed content, so this only works when the app is served over plain http.
- **UI state desyncs from the robot.** `isMeasuring` is local state initialised to `false` while the robot's continuous-measurement flag survives page reloads and reconnects, so the button can say "Start Measuring" while the robot is already streaming (and the other way round after a robot reboot). **[cross-repo]** Reset to a known state on `onopen` (send `MEASURE_STOP`, or better: have the robot send its state on connect).

### 1.3 Rendering

- **A repaint per frame instead of per sweep.** The robot sends 10 `MEASURE` frames per sweep; `RobotPreview` calls `redrawCanvas()` (clear + chassis + all cones) for each one, i.e. 10 full repaints per sweep and ~55 cone draws, and the picture shows a half-old/half-new sweep in between. Fix: update the map in the subscriber and schedule a single `requestAnimationFrame` redraw (coalesced), or batch on the wire **[cross-repo]**.
- **Stale readings stay on screen forever.** `distances` is never cleared or aged, so if a sensor stops reporting (or measuring is stopped, or the socket drops) its last cone remains drawn as if current. Fix: timestamp entries, fade or drop old ones, and clear on `MEASURE_STOP`/disconnect.
- **`>= 1000` is drawn as a real 1000mm obstacle.** The firmware reports "out of range" as `1000` (see its STATUS), so the preview draws a green 500px arc that runs off the canvas instead of "nothing detected". **[cross-repo]** Agree on a sentinel and draw it differently (e.g. dashed full-length cone).
- **Not HiDPI-aware, fixed size.** The canvas is `width="600" height="600"` in the template and `600`/`300` literals in `drawing.ts` (`fillRect(0,0,600,600)`, `X_CENTER`, `Y_CENTER`), with no `devicePixelRatio` scaling, so it's blurry on retina/phone screens and doesn't scale to the viewport. Derive the size from one constant and set up the context transform once.
- `drawDistance()` first paints a gray 300px-radius sector *for every sensor on every frame*, then paints the colored one over it. The gray "max range" sector should be drawn once (static layer or offscreen canvas), and the `canvas.getContext('2d')!` lookup is repeated in every draw call; resolve the context once.

### 1.4 Forms / input

- **Slider sends a `SPEED` message for every `input` event** (dozens per second while dragging) with no throttling; each one is a console log + a TCP frame to a microcontroller that also logs it over serial. Throttle/debounce (trailing) or send on `change`.
- **Slider initial value is hardcoded** (`[value]="1000"` in `steering.html`) and never sent on connect, so the slider's idea of the speed only matches the robot's because the firmware default happens to be 1000. Likewise the PID initial values (`0.15/0.05/0`) duplicate the firmware defaults. **[cross-repo]** Initialise from a state frame sent by the robot, or push the UI values on connect.
- **PID inputs can send `null`/`NaN`.** Clearing a number input gives `null` through `ngModel`, producing `PID null 0.05 0`; the firmware's `toFloat()` turns `"null"` into 0, silently zeroing a gain. Validate (finite numbers, sensible range) before sending.
- The PID `<button>` lives inside a `<form>` without `type="button"`. It works today only because `NgForm` suppresses the native submit; set `type="button"` (or use `(ngSubmit)`) so it doesn't depend on that. The inputs also have `for="P"` labels without matching `id`s (they use `name`), so the labels aren't associated.
- Icon-only buttons have no `aria-label`, and the direction pad isn't operable by keyboard or screen reader (mouse/touch only).

### 1.5 Tests & project metadata

- **`app.spec.ts` is stale and fails:** it expects an `h1` containing `Hello, exploring-robot`, which the template doesn't have (the default CLI scaffold). There are no other tests; the message parser and `drawing.ts` are untested.
- **Naming mismatch:** the package is `exploring-robot` (package.json), the README is "ExploringRobot" (Angular CLI boilerplate), the repo and header are "the-sneaky-spy". Pick one and replace the README with a real one (run instructions, robot IP config, protocol link).
- `provideRouter(routes)` is configured but there is no `<router-outlet>`; `app.routes.ts` is empty. Remove or use it.

---

## 2. Bad practices / code smells

1. **Stringly-typed protocol, scattered.** Direction names (`'FORWARD_LEFT'` ...) appear as string literals in `steering.html`, `steering.ts`, `control-panel.ts`, and `drawing.ts` keys, with no shared type. A typo is only caught at runtime, on the robot. Create `src/protocol.ts` with `type DriveDirection = ...`, `type SensorDirection = ...`, `encodeCommand()` / `parseMessage()` returning a discriminated union (`{type:'measure', direction, distance}`), and make `SocketService.send()` accept only typed commands.
2. **Parsing lives in a component.** `RobotPreview`'s constructor does `msg.split(" ")` and mutates render state. Move it to the service (typed `measurements$`), so there's one place that validates frames and other components can subscribe. Validate `direction` against the known keys there too (today it's only checked later in `drawDistance`, *after* the entry is already stored in the map, which the old stall bug in `CLAUDE.md` exploited).
3. **Console logging on the hot path.** Each measurement frame produces ~6 `console.log` lines (`SocketService` + subscriber + `redrawCanvas` + per-sensor draw), i.e. ~60 logs per sweep. Remove, or put behind a debug flag/logger.
4. **Unused code and imports:**
   - `control-panel.ts`: a duplicate `KEY_TO_DIRECTION` and imports `effect`, `ElementRef`, `HostListener`, `inject`, `OnInit`, `OnDestroy`, `signal`, `ViewChild`, `Subject`, `Subscription`, `throttleTime`, `faLightbulb`, `SocketService`, none used.
   - `steering.ts`: `effect`, `ElementRef`, `HostListener` (commented out), `ViewChild`, `faLightbulb`.
   - `robot-preview.ts`: `ChangeDetectorRef` (injected, unused), `HostListener`, `Subscription`, `interval`.
   - `app.ts`: `signal`.
   - `drawing.ts`: `DISTANCE_POSITIONS`, the commented-out block in `drawDistance`, and `drawArrowLeftForward/LeftBackward/RightForward/RightBackward` (+ commented calls in `drawAll`).
5. **Mixed Angular styles in a "signals / zoneless" app:** legacy `@Input()`/`@Output()`/`EventEmitter` and `@ViewChild` in `slider`, `longpress-button`, `robot-preview`, plain mutable fields (`isMeasuring`, `value`) next to signals in `Steering`; some components declare `standalone: true` (redundant in v21) and others don't. Migrate to `input()`/`output()`/`model()`/`viewChild()` and signals consistently. `Slider` mutates its own `@Input` (`this.value = newValue`) to fake two-way binding; `model()` is the right tool.
6. **No unsubscribe / lifecycle in `RobotPreview`** for `messages$` (see CLAUDE.md known gotchas). Use `takeUntilDestroyed()`.
7. **Inline styles and magic colors in templates/drawing code** (`robot-preview.html` button styles, `#966`/`#986`/`#996`/`#575`, distance thresholds 100/200/300). Move to SCSS variables / a named threshold table.
8. **Drawing code is a pile of coordinates:** repeated `X_OFFSET + TOTAL_WIDTH - ...` expressions and a hand-written chassis polygon. Compute the sensor positions/angles and the polygon from a few robot-dimension constants (ideally in mm, with one `PX_PER_MM` scale) so changing the robot geometry means editing a few numbers.
9. `Steering` mixes UI state, input mapping and protocol encoding. Once there is a typed protocol layer (item 1), `Steering` should only translate UI events into typed commands.
10. `rxjs 7.8.0` / `tslib 2.3.0` are pinned to old minors; `.vscode/` and tooling config are fine. Low priority, but worth a `npm outdated` pass.

---

## 3. Useful refactors / improvements

### 3.1 Reliability and UX (do first)

- **Connection indicator + reconnect + disabled controls when offline** (see 1.2). The single biggest usability gap: failures are currently invisible.
- **Always-visible emergency STOP** that is also bound to `Space`/`Esc` and to the window `blur`/`visibilitychange` events (stop the robot when the tab is hidden or loses focus).
- **Stop on release** and **send on change + heartbeat** instead of blind 500ms repeats (see 1.1).
- Make the robot address configurable in the UI (persist in `localStorage`), and show the firmware's reported state/version once the firmware sends a state frame **[cross-repo]**.
- Show measurement freshness (age per sensor, or a global "last sweep: 0.4s ago"), and mark sensors with no data / out of range distinctly.
- Mobile support: the pad is touch-capable but unstyled for it (`touch-action`, prevent text selection/context menu on long press, viewport meta, larger targets, landscape layout).

### 3.2 Architecture

- **Typed protocol layer** (`src/protocol.ts`) + `SocketService` that owns connection lifecycle and exposes signals/observables: `status`, `measurements` (latest per sensor with timestamp), and typed `send(command)`. Components consume signals, not raw strings. Use `toSignal()` in `RobotPreview` and re-render from an `effect` + `requestAnimationFrame`.
- Split `RobotPreview` into a dumb canvas renderer (`draw(measurements)`) and a container; unit-test the renderer with a mock context.
- Move code to a conventional layout: `socket.service.ts` currently sits at `src/` next to `main.ts` while components are in `src/components/` rather than `src/app/components/` (CLAUDE.md describes `app/components`, which is not the actual layout). Decide on the layout (`core/`, `features/`, `shared/`) and update CLAUDE.md.
- Environment configuration (`environment.ts` or a runtime `config.json`) for the robot URL, speed range, and PID defaults.

### 3.3 Features worth considering

- Live **PID tuning aid**: an optional chart of target vs actual wheel speed. Needs the firmware to publish `SPEED_STATE` / telemetry frames **[cross-repo]**.
- Sensor view improvements: numeric labels on the cones (the old `DISTANCE_POSITIONS` text approach was dropped, but labels are useful), a legend for the color bands, and an adjustable zoom/`PX_PER_MM`.
- Gamepad API support (and/or on-screen joystick with proportional speed) as an alternative to the 9-button pad; proportional control makes the 0.7 `TURNING_FACTOR` hack unnecessary on the robot side **[cross-repo]**.
- Record/replay of sensor sweeps (store frames in memory/IndexedDB, replay on the canvas) for debugging without the robot, and a mock `SocketService` for development/tests with no hardware.
- Basic obstacle map accumulation (needs odometry from the firmware **[cross-repo]**).

### 3.4 Tooling

- Replace the stale `app.spec.ts` with tests for the parser (valid, malformed, unknown direction, extra tokens), the `LongPressButton` (single start/stop, double start, cancel), and a `SocketService` fake-`WebSocket` test of `send()` in each `readyState`.
- ESLint (`angular-eslint`) with `no-unused-vars` / `no-console` would have caught most of section 2 item 3/4 automatically. Add a `lint` script and run it in CI if one exists.
- Replace the CLI-boilerplate `README.md` with: how to run, where to set the robot IP, link to the firmware repo, and a pointer to the protocol docs.
