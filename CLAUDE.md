# the-sneaky-spy (Robot control frontend)

Angular 21 (zoneless, standalone components, signals) single-page app that connects over a raw WebSocket to a companion ESP32 robot firmware (separate repo: `PlatformIO/Projects/Arduino Nano ESP32 OTA test`, see its `CLAUDE.md`) to drive it and visualize its 10 distance sensors in real time on a `<canvas>`.

## Stack / commands

- Angular 21.1.4, standalone components, no NgModules.
- RxJS 7.8 for event streams (`Subject`, `throttleTime`, `takeUntil`).
- FontAwesome (`@fortawesome/angular-fontawesome`) for icons.
- Test runner: Vitest (not Karma/Jasmine) + jsdom.
- `npm start` — `ng serve` (dev server).
- `npm run build` — `ng build`.
- `npm run watch` — `ng build --watch --configuration development`.
- `npm test` — `ng test` (Vitest).

## Architecture

```
app/
└── components/
    ├── header/                     presentational header
    └── control-panel/
        ├── control-panel.ts/html   hosts <steering> + <robot-preview>, no logic of its own
        ├── steering/               direction/speed/PID controls, keyboard input
        ├── longpress-button/       emits `press` repeatedly while held (used for continuous direction commands)
        ├── slider/                 generic numeric slider, two-way-bindable via @Input/@Output
        └── robot-preview/          canvas visualization of the robot + live sensor cones
src/socket.service.ts                singleton WebSocket wrapper (root-provided)
```

`SocketService` (`src/socket.service.ts`) is the **only** WebSocket connection in the app — a root-provided singleton holding one `WebSocket` and one RxJS `Subject<string>` (`messages$`) that every incoming text frame is pushed onto, unparsed. `connect()` currently hardcodes `ws://192.168.1.16:88` — update this if the robot's IP changes (no env-based config exists yet). `send(message: string)` writes raw strings directly to the socket, no outgoing queue/backpressure.

Each component that cares about `messages$` subscribes directly and parses raw text itself — there is no central store or typed message bus. Currently the only subscriber is `RobotPreview`.

## Communication schema (WebSocket, plain text, no JSON)

See the firmware repo's `CLAUDE.md` for the authoritative wire format; mirrored here for quick reference.

**Outgoing (this app → robot)**, all sent via `SocketService.send()`:
- `<DIRECTION>` — one of `FORWARD`, `FORWARD_LEFT`, `FORWARD_RIGHT`, `LEFT`, `STOP`/`BRAKE`, `RIGHT`, `BACKWARD`, `BACKWARD_LEFT`, `BACKWARD_RIGHT` — sent from `Steering.move()` (button `(mousedown)`/`longpress-button` press events) and from the `w/q/e/a/s/d/x/z/c` keyboard shortcuts (`KEY_TO_DIRECTION` map in `steering.ts`, throttled to 500ms via `throttleTime`). Note: the keyboard `@HostListener` is currently commented out in `steering.ts` — keyboard steering is wired but not actually bound to an event source.
- `SPEED <number>` — from the speed `Slider`.
- `PID <P> <I> <D>` — from the three PID gain signals in `Steering` (`P`, `I`, `D`), sent on `setPid()`.
- `MEASURE_START` / `MEASURE_STOP` — from the "Start/Stop Measuring" toggle button in `RobotPreview` (`toggleMeasurement()`), enables/disables the robot's continuous 200ms sensor-sweep broadcast.

**Incoming (robot → this app)**, handled only in `RobotPreview`'s constructor subscription to `messages$`:
- `MEASURE <DIRECTION> <uint16>` — one frame per sensor (10 per sweep). Parsed via `msg.split(" ")`; `direction` must match a key in `DIRECTION_CONFIG` (`drawing.ts`) and `distance` must parse to a non-NaN int, or the frame is dropped (validated defensively — malformed frames are logged and ignored rather than allowed to corrupt render state).

## Robot preview rendering (`robot-preview/`)

- `distances: Map<string, number>` in `RobotPreview` accumulates the latest value per sensor direction, keyed by the direction string from the wire format.
- `redrawCanvas()` does a **full imperative repaint** on every incoming measurement: `drawAll(canvas)` (clears + redraws the chassis/wheels) then iterates `distances` and calls `drawDistance(distance, direction, canvas)` for every known sensor. This is not React/signals-driven — it's plain `CanvasRenderingContext2D` calls with no diffing, memoization, or `requestAnimationFrame` loop; every message triggers one synchronous full repaint.
- `drawing.ts` has two parallel direction-keyed config tables: `DISTANCE_POSITIONS` (currently unused — dead code left over from an earlier text-label rendering approach, see commented-out block at the top of `drawDistance`) and `DIRECTION_CONFIG` (actually used — `{x, y, angle}` per sensor, used to draw a colored arc "cone" whose radius = `distance * PX_PER_MM` and color encodes distance bands: red <100mm, orange <200mm, yellow <300mm, green ≥300mm).
- `ChangeDetectorRef` is injected in `RobotPreview` but never used — dead code from an earlier (unnecessary) attempt to fix a rendering bug via manual change detection; irrelevant here since canvas painting is imperative and bypasses Angular's template/change-detection pipeline entirely.

## Known gotchas / fragile areas

- **One bad frame used to be able to permanently stall the preview.** `distances.forEach(...)` inside `redrawCanvas()` iterates in Map insertion order; if `drawDistance` or a bad parse ever throws, RxJS's `Subject` subscriber swallows the exception and rethrows it asynchronously via `setTimeout` — completely disconnected from the `console.log` that printed right before it. Any Map entry positioned after the exception point in iteration order would then silently stop being redrawn on every subsequent message, even though new data kept arriving and logging normally (the Map itself is never cleared or reset). Mitigated by validating `direction`/`distance` before insertion (see above), but if you add new incoming message types or fields, keep validating before they hit shared render state — don't rely on `Subject` subscribers to surface errors visibly.
- **No `ngOnDestroy` unsubscribe** for the `messages$.subscribe(...)` in `RobotPreview` — harmless today since the singleton `SocketService`/component both live for the app's lifetime, but would leak if `RobotPreview` were ever conditionally created/destroyed.
- **Hardcoded robot IP** (`ws://192.168.1.16:88` in `socket.service.ts`) — breaks silently (just never connects) if the robot's IP changes; there's no connection-status UI beyond `console.log('Connected'/'Disconnected')`.
- **No reconnect logic** — if the WebSocket drops, `SocketService` does not retry; the page must be reloaded.
- Continuous measurement mode produces data at ~2-3Hz in practice (sensor sweep takes ~330ms despite a 200ms request interval on the firmware side) — don't expect smoother than that from the robot regardless of frontend changes.

## Companion firmware

Robot-side WebSocket server + command handling lives in a separate repo: `C:\Users\fwisn\Documents\PlatformIO\Projects\Arduino Nano ESP32 OTA test` (see its own `CLAUDE.md`).
