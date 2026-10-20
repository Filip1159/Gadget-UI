# Gadget-UI (Frontend) - Status / Backlog

Working list for the frontend. `[x]` = implemented, `[ ]` = open.

Companion list for the firmware: `C:\Users\fwisn\Documents\PlatformIO\Projects\Arduino Nano ESP32 OTA test\STATUS.MD`. Items tagged **[cross-repo]** needed (or need) a change on both sides; the wire format changed, so **deploy the frontend and flash the firmware together**.

All `[x]` items are implemented and verified (automated tests plus the robot).

---

## 1. Bugs

### 1.1 Robot control (safety-relevant)

- [x] **Releasing a direction button never stopped the robot.** `LongPressButton` has a `release` output and every direction button sends `STOP` on release/cancel/pointer-leave/destroy. The firmware also stops by itself after 1s without a command. **[cross-repo]**
- [x] **Keyboard steering sent commands that crash the firmware** (`s` -> `BRAKE`, `"undefined"` for unmapped keys). Commands are now a typed union (`protocol.ts`), `s` is `STOP`, keys are lowercased and unmapped keys ignored.
- [x] **Keyboard design problems.** Re-enabled and redesigned as `KeyboardSteering` (`steering/keyboard-steering.ts`, framework-free, 4 tests): keydown sends and repeats a 500ms heartbeat while held, keyup falls back to a still-held key or sends `STOP`, `s` and window blur stop, auto-repeat/unmapped keys/Ctrl-Alt-Meta combos/typing in inputs are ignored. `Space` and `Esc` are emergency stops and a hidden tab (`visibilitychange`) stops the robot.
- [x] **`LongPressButton` double-fire / leaked timers on touch.** Pointer Events, re-entry guard, `touch-action: none`, no context menu, `press` emitted synchronously on pointer down (so a very quick tap still sends its direction before the `STOP`). 3 tests.
- [x] Repeat commands reset the robot's PID. Fixed on the firmware side (reset only on direction change); the 500ms repeat stays, as it is the heartbeat the firmware's timeout relies on. **[cross-repo]**
- [x] `send()` could throw or silently drop. It now takes a typed `Command`, checks `readyState`, returns `false` and warns when the socket is not open, and the UI disables the direction pad while offline (STOP stays enabled).

### 1.2 Connection

- [x] `connect()` was called from `RobotPreview`'s constructor. `App` now connects once; `connect()` is idempotent.
- [x] No reconnect / status / `onerror`. `SocketService` has a `status` signal, reconnects with backoff (0.5s to 10s), handles `onerror`; a red banner shows while not connected.
- [x] Hardcoded robot address. `localStorage.robotUrl` + an address field in the banner (validated `ws(s)://`, reconnects immediately; the old socket cannot trigger a reconnect to the old URL). The default URL now lives in `src/config.ts`. [ ] It is still a build-time constant (no runtime `config.json`); `ws://` still only works from an `http://` page.
- [x] UI state desynced from the robot (`isMeasuring`). The firmware sends a `STATE` frame on connect and the preview follows it; `isMeasuring` is a signal. **[cross-repo]**

### 1.3 Rendering

- [x] A full repaint per frame. Frames are now one atomic sweep (**[cross-repo]** batched `MEASURE` frame) and repaints are coalesced into one `requestAnimationFrame`.
- [x] Stale readings stayed on screen forever. The whole picture is cleared if no sweep arrives for 3s, on disconnect, and on stop measuring. (Per-sensor aging is moot now that a sweep is atomic.)
- [x] `>= 1000` was drawn as a real 1000mm obstacle. The wire carries `OOR` and it is drawn as a dashed full-range outline. **[cross-repo]**
- [x] HiDPI: the backing store is scaled by `devicePixelRatio`; the canvas is sized in CSS (`width: 100%`, max 600px) so it shrinks on narrow screens. [ ] The logical size is still 600px (no resize observer).
- [x] The robot is drawn once into an offscreen layer and copied per frame, the 2D context is looked up once, and the redundant grey max-range sectors (same colour as the background, they only erased neighbouring cones) are gone.

### 1.4 Forms / input

- [x] Slider sent a `SPEED` message for every `input` event. Now throttled (100ms, leading + trailing so the final value always goes out).
- [x] Slider and PID initial values were hardcoded duplicates of the firmware defaults. They are now initialised from the robot's `STATE` frame (the constants in `Steering` are only the pre-connect placeholder). **[cross-repo]**
- [x] PID inputs could send `null`/`NaN`. Values are validated (finite, >= 0) and "Set PID" is disabled otherwise.
- [x] PID `<button>` is `type="button"`, labels are tied to the inputs by `id`, icon-only buttons have `aria-label`s.
- [ ] The direction pad is not operable by keyboard/screen reader in the "hold" sense (Enter/Space on a focused pad button does not press-and-hold). The `wqeadxzc` shortcuts cover keyboard users, but there is no accessible equivalent on the buttons themselves.

### 1.5 Tests & project metadata

- [x] Stale `app.spec.ts` replaced by a render test of the whole app (fake `WebSocket`, fake canvas context): banner/disabled pad when offline, enabled pad + controls initialised from `STATE` when online, `STOP` on release, `ERR` banner. Plus specs for `protocol` (parse/encode), `SocketService` (not-open handling, reconnect backoff, auth-first, state/error streams, `setUrl`), `LongPressButton`, `KeyboardSteering`: 27 tests.
- [x] README replaced (run, connect, controls, layout).
- [x] Renamed to Gadget-UI: package and Angular project `gadget-ui`, header and page title "Gadget". (The repo folder is still `the-sneaky-spy`.)
- [x] Unused `provideRouter`/`app.routes.ts` removed.

---

## 2. Bad practices / code smells

- [x] Stringly-typed protocol. `src/protocol.ts` has `DriveDirection`, `SensorDirection`, `Command`, `encodeCommand`, `parseMessage`; `SocketService.send()` only accepts typed commands.
- [x] Parsing lived in a component. `SocketService` exposes validated streams (`sweeps$`, `state$`, `errors$`); unknown sensors and malformed frames are rejected before they reach render state.
- [x] Console logging on the hot path removed (remaining `console.warn/error` are for real problems: socket error, dropped send, unparseable frame, unknown sensor in `drawDistance`).
- [x] Unused code and imports (`DISTANCE_POSITIONS`, `drawArrow*`, commented blocks, duplicate key map, unused imports in `control-panel.ts`/`steering.ts`/`robot-preview.ts`/`app.ts`).
- [x] Mixed Angular styles: `slider` is `model()`, `longpress-button` is `input()`/`output()`, `robot-preview` uses `viewChild()`/`afterNextRender`, `isMeasuring` is a signal, redundant `standalone: true` removed. (No legacy `@Input/@Output/@ViewChild` left.)
- [x] No unsubscribe in `RobotPreview`; all subscriptions use `takeUntilDestroyed()` (or are cleaned in `ngOnDestroy`).
- [x] Button styles are in `robot-preview.scss`; colour bands are the `RANGE_BANDS` table in `sensor-renderer.ts`.
- [x] Robot geometry is in millimetres in `robot-geometry.ts` (chassis polygon, wheels and sensor mounts computed from the real dimensions), and `SensorRenderer` uses one px-per-mm scale.
- [x] `Steering` mixed UI state, key mapping and protocol encoding. It now only translates UI events into typed commands; key logic is in `KeyboardSteering`.
- [ ] `rxjs 7.8.0` / `tslib 2.3.0` are pinned to old minors; worth an `npm outdated` pass.

---

## 3. Useful refactors / improvements

### 3.1 Reliability and UX

- [x] Connection indicator + reconnect + disabled controls when offline.
- [x] Emergency STOP: the STOP button is always enabled, `Space`/`Esc` stop from anywhere, window blur and `visibilitychange` stop too.
- [x] Stop on release; send on change + heartbeat. (Keyboard: yes; buttons: repeat every 500ms while held, which is the heartbeat.)
- [x] Robot address configurable in the UI; UI initialised from the robot's reported state **[cross-repo]**. [ ] Firmware version is not part of `STATE` yet.
- [ ] Show measurement freshness in the UI (for example "last sweep 0.4s ago"); today stale data is only cleared after 3s.
- [ ] Mobile support: the pad is touch-capable (pointer events, `touch-action`) but there is no viewport/landscape layout or larger targets, and the canvas is a fixed 600px.

### 3.2 Architecture

- [x] Typed protocol layer + `SocketService` owning the connection lifecycle with `status` signal and typed streams. (`toSignal()` in `RobotPreview` was not needed; it renders from a coalesced `requestAnimationFrame`.)
- [x] `RobotPreview` is split: `SensorRenderer` draws (`render(sweep)`, unit-tested with a recording context, 10 new tests), the component handles state, scheduling and the measuring toggle.
- [ ] Decide on a folder layout (`core/`, `features/`, `shared/`). `socket.service.ts`/`protocol.ts` sit in `src/` next to `main.ts` and components are in `src/components/`; `CLAUDE.md` now describes the real layout.
- [x] `src/config.ts` holds the default robot URL, speed range/step and the placeholder speed/PID. [ ] Not a runtime `config.json` yet.

### 3.3 Features worth considering

- [ ] Live PID tuning aid: chart of target vs actual wheel speed (needs firmware telemetry frames **[cross-repo]**).
- [ ] Sensor view: numeric labels on the cones, a legend for the colour bands, adjustable zoom (`PX_PER_MM`).
- [ ] Gamepad API / on-screen joystick with proportional speed; makes the 0.7 `TURNING_FACTOR` hack unnecessary **[cross-repo]**.
- [ ] Record/replay of sensor sweeps and a mock robot (`SocketService` fake) for development without hardware (`app.spec.ts` already has a minimal fake `WebSocket` to start from).
- [ ] Basic obstacle map accumulation (needs odometry from the firmware **[cross-repo]**).

### 3.4 Tooling

- [x] Tests for the parser/encoder, `SocketService`, `LongPressButton`, `KeyboardSteering`, and the rendered app.
- [ ] ESLint (`angular-eslint`) with `no-unused-vars` / `no-console`, a `lint` script, and CI if one exists.
- [x] README with run instructions, how to set the robot address/token, controls, layout.
