# the-sneaky-spy

Browser control panel for a 2-wheeled ESP32 robot: drive it with on-screen buttons or the keyboard, tune the wheel PID, and watch its 10 distance sensors on a live canvas.

Angular 21 (zoneless, standalone components, signals). Talks to the robot over a plain-text WebSocket (`ws://<robot>:88`). The robot firmware lives in a separate repo: `PlatformIO/Projects/Arduino Nano ESP32 OTA test` (its `CLAUDE.md` has the authoritative wire format).

## Run

```bash
npm install
npm start        # dev server on http://localhost:4200
npm test         # Vitest + jsdom
npm run build
```

Serve the app over plain `http://` (the dev server does): a page served over `https://` cannot open an insecure `ws://` connection.

## Connecting to the robot

- Default address: `ws://192.168.1.16:88`.
- If the robot is not reachable, a red banner at the top lets you type another address (for example `ws://robot.local:88`) and an optional token, then reconnect. The address and token are remembered in `localStorage` (`robotUrl`, `robotToken`).
- The token is only needed if the firmware was built with `WS_TOKEN`; it is sent as the first frame (`AUTH <token>`).
- The app reconnects automatically (backoff 0.5s to 10s) and disables the direction pad while disconnected. STOP stays enabled.

## Controls

| Input | Action |
|---|---|
| Arrow pad buttons | Drive while held (command repeats every 500ms); releasing sends `STOP` |
| `w` `q` `e` `a` `d` `x` `z` `c` | Forward, forward-left, forward-right, left, right, backward, backward-left, backward-right while held |
| `s`, `Space`, `Esc`, window loses focus, tab hidden | Stop |
| Speed slider | Target wheel speed (0-2000), throttled |
| P / I / D + "Set PID" | Wheel PID gains (finite numbers >= 0) |
| Start/Stop Measuring | Continuous 10-sensor sweeps, drawn as cones around the robot |

The robot also stops by itself if no command arrives for 1 second or the connection drops.

## Layout

```
src/
  main.ts, app/                 bootstrap, root component, connection/error banners
  protocol.ts                   typed wire protocol: commands, parsing of MEASURE / STATE / ERR frames
  socket.service.ts             the only WebSocket: status, reconnect, auth, typed send(), parsed streams
  components/
    control-panel/              hosts steering + robot preview
      steering/                 buttons, slider, PID form, keyboard (keyboard-steering.ts)
      longpress-button/         repeating press + release output
      slider/                   two-way (model) range input
      robot-preview/            canvas renderer (drawing.ts) + container
```

More detail for contributors (and for AI assistants) is in `CLAUDE.md`; the open backlog is in `STATUS.MD`.
