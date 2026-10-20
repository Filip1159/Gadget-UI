# the-sneaky-spy (Robot control frontend)

Angular 21 (zoneless, standalone components, signals) single-page app that connects over a raw WebSocket to a companion ESP32 robot firmware (separate repo: `PlatformIO/Projects/Arduino Nano ESP32 OTA test`, see its `CLAUDE.md`) to drive it and visualize its 10 distance sensors in real time on a `<canvas>`.

## Stack / commands

- Angular 21.1.4, standalone components, no NgModules. New code uses signal APIs (`input()`, `output()`, `model()`, `viewChild()`, `signal()`), not the legacy decorators.
- RxJS 7.8 for event streams (`Subject`, `throttleTime`, `share`, `takeUntilDestroyed`).
- FontAwesome (`@fortawesome/angular-fontawesome`) for icons.
- Test runner: Vitest (not Karma/Jasmine) + jsdom. Specs live next to the code (`*.spec.ts`); `app.spec.ts` renders the whole app against a fake `WebSocket` and a fake canvas context.
- `npm start` - `ng serve` (dev server, http only: `ws://` is blocked from an `https://` page).
- `npm run build` - `ng build`.
- `npm run watch` - `ng build --watch --configuration development`.
- `npm test` - `ng test` (Vitest).

## Architecture

```
src/
  main.ts, app/                    bootstrap; App connects the socket and shows the connection/error banners
  protocol.ts                      typed wire protocol: Command + encodeCommand, parseMessage (MEASURE / STATE / ERR), direction types
  socket.service.ts                singleton WebSocket wrapper (root-provided)
  components/
    header/                        presentational header
    control-panel/
      control-panel.ts/html        hosts <steering> + <robot-preview>, no logic of its own
      steering/                    direction pad, speed slider, PID form; keyboard-steering.ts is the framework-free keyboard logic
      longpress-button/            emits `press` immediately and every 500ms while held, `release` once at the end
      slider/                      numeric slider with a `model()` value (two-way bindable)
      robot-preview/               canvas visualization (drawing.ts = pure drawing code) + sensor cones
```

`SocketService` is the **only** WebSocket in the app. It is connected once by `App`. It provides:
- `status` signal (`connecting | open | closed`), automatic reconnect with exponential backoff (0.5s to 10s), `onerror` handling.
- `url` / `setUrl()` and `token` / `setToken()`, persisted in `localStorage` (`robotUrl`, `robotToken`; default `ws://192.168.1.16:88`). If a token is set it is sent as the very first frame (`AUTH <token>`) on every (re)connect.
- `send(command: Command): boolean` - typed; returns `false` (and warns) when the socket is not open, never throws.
- Parsed streams, all fed from one validated parse (`robot$` is `share()`d): `sweeps$` (one full sensor sweep per frame), `state$` (robot settings after connect), `errors$` (robot rejections, also surfaced as `lastError`, auto-cleared after 4s). Unrecognised/malformed frames are logged once and dropped. `messages$` is the raw text stream; prefer the parsed ones.

Components never build or parse wire strings themselves: they send `{ type: 'drive', direction }` etc. and subscribe to the parsed streams.

## Communication schema (WebSocket, plain text, no JSON)

See the firmware repo's `CLAUDE.md` for the authoritative wire format; mirrored here for quick reference. Everything below is typed in `protocol.ts` (`Command`, `RobotMessage`).

**Outgoing (this app -> robot)**:
- `AUTH <token>` - only if a token is configured; always first.
- `<DIRECTION>` - one of `FORWARD`, `FORWARD_LEFT`, `FORWARD_RIGHT`, `LEFT`, `STOP`, `RIGHT`, `BACKWARD`, `BACKWARD_LEFT`, `BACKWARD_RIGHT` (`DriveDirection`; anything else is rejected by the firmware with `ERR`). Sent from the direction buttons (`longpress-button` repeats every 500ms while held; `release` sends `STOP`; buttons are disabled while the socket is not open, STOP never is) and from the keyboard through `KeyboardSteering`: `w q e a d x z c` = the eight directions while held (keydown sends + 500ms heartbeat; keyup sends the direction of a key still held or `STOP`), `s`, Space, Esc, window blur and a hidden tab = `STOP`; keystrokes in inputs and Ctrl/Alt/Meta combos are ignored. The firmware stops by itself after 1s without a direction command, which is why the heartbeat matters.
- `SPEED <number>` - from the speed slider (throttled to one per 100ms, trailing value always sent).
- `PID <P> <I> <D>` - from the PID form; only sent for finite numbers >= 0 (the button is disabled otherwise).
- `MEASURE_START` / `MEASURE_STOP` - from the "Start/Stop Measuring" button.

**Incoming (robot -> this app)**:
- `MEASURE <DIRECTION>=<mm|OOR> ...` - one frame per sweep with all 10 sensors (`OOR` = out of range, drawn as a dashed outline). All-or-nothing parse: a malformed token or unknown sensor drops the whole frame; a valid frame replaces the whole distance map.
- `STATE SPEED=<n> P=<f> I=<f> D=<f> MEASURING=<0|1>` - sent right after connect; initialises the slider, PID fields and the measuring button, so UI and robot cannot disagree after a reload/reconnect.
- `ERR <reason>` - a command was rejected; shown in an orange banner.

## Robot preview rendering (`robot-preview/`)

- `RobotPreview` keeps the latest `Sweep` (direction -> mm | null) and a timestamp. Frames are coalesced: each sweep schedules a single `requestAnimationFrame` repaint. Readings are cleared if no sweep arrives for 3s, on disconnect, and when measuring is stopped.
- `redrawCanvas()` is a full imperative repaint: `drawAll(canvas)` (background + chassis + wheels) then `drawDistance(distance, direction, canvas)` per sensor. `drawing.ts` is pure canvas code with `DIRECTION_CONFIG` (`{x, y, angle}` per sensor) and colour bands: red <100mm, orange <200mm, yellow <300mm, green >= 300mm; `null` (OOR) is a dashed full-range outline.
- The canvas is HiDPI-aware: its backing store is scaled by `devicePixelRatio` in `initCanvas()` (run via `afterNextRender`), while all drawing code stays in 600x600 logical pixels.

## Known gotchas / fragile areas

- **Validate before touching shared render state.** `Subject` subscribers swallow exceptions (rethrown asynchronously), so a throw inside a subscriber looks like data silently stopping. All parsing is therefore done up front in `protocol.ts` and bad frames never reach `RobotPreview`; keep it that way when adding message types.
- **Everything the robot should do on its own is also enforced in firmware** (stop on disconnect, 1s command timeout), because browser tabs die. Do not rely on the UI alone to stop the robot.
- `ws://` only works from an `http://` page (mixed-content rule). The token is sent in clear text.
- `LongPressButton` emits `press` synchronously on pointer down (so even a very short tap sends its direction before the `STOP`), and guards against a second start while pressed; keep both properties if you touch it.
- Continuous measurement is paced by the firmware (a new sweep is requested every 200ms, sweeps are ranged in parallel), so the frontend cannot make it update faster.
- jsdom has no canvas: component tests must mock `HTMLCanvasElement.prototype.getContext` (see `app.spec.ts`).

## Companion firmware

Robot-side WebSocket server + command handling lives in a separate repo: `C:\Users\fwisn\Documents\PlatformIO\Projects\Arduino Nano ESP32 OTA test` (see its own `CLAUDE.md`).
