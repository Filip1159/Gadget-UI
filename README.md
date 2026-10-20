# Gadget-UI

Browser control panel for [Gadget](https://github.com/Filip1159/Gadget-firmware), a small 2-wheeled exploring robot

## Features

- Drive with on-screen buttons or the keyboard, with adjustable speed
- Tune the wheel PID gains live
- Live view of Gadget's 10 distance sensors, drawn to scale around the robot on a canvas
- Connection status, automatic reconnect and optional token auth
- Angular 21 (zoneless, standalone components, signals), talking to the robot over a plain-text WebSocket (`ws://<robot>:88`)

#

```bash
npm install
```

```bash
npm start        # dev server on http://localhost:4200
```

```bash
npm test         # Vitest + jsdom
```

#

Serve the app over plain `http://` (the dev server does): a page served over `https://` cannot open an insecure `ws://` connection.

## Connecting to the robot

- Default address: `ws://192.168.1.16:88`.
- If the robot is not reachable, a red banner at the top lets you type another address (for example `ws://gadget.local:88`) and an optional token, then reconnect. The address and token are remembered in `localStorage` (`robotUrl`, `robotToken`).
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
