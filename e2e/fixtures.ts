import { expect, Locator, Page, test as base, WebSocketRoute } from '@playwright/test';

export const ROBOT_URL = 'ws://robot.test:88';

export const SENSORS = [
  'FRONT',
  'FRONT_LEFT_45',
  'FRONT_LEFT',
  'FRONT_RIGHT_45',
  'FRONT_RIGHT',
  'BACK',
  'BACK_LEFT_45',
  'BACK_LEFT',
  'BACK_RIGHT_45',
  'BACK_RIGHT',
];

/** "MEASURE FRONT=<mm> ..." for all ten sensors; `overrides` replace single readings (number or 'OOR'). */
export const measureFrame = (
  mm: number | 'OOR' = 250,
  overrides: Record<string, number | 'OOR'> = {},
): string => 'MEASURE ' + SENSORS.map((s) => `${s}=${overrides[s] ?? mm}`).join(' ');

export const stateFrame = (
  s: { speed?: number; p?: number; i?: number; d?: number; measuring?: boolean } = {},
): string =>
  `STATE SPEED=${s.speed ?? 1000} P=${s.p ?? 0.15} I=${s.i ?? 0.05} D=${s.d ?? 0} MEASURING=${s.measuring ? 1 : 0}`;

export const poseFrame = (x: number, y: number, thMrad = 0, extra = ''): string =>
  `POSE X=${x} Y=${y} TH=${thMrad} T=1000 Q=0${extra}`;

/** The robot as seen from the browser: a fake WebSocket server that records what the UI sends. */
export class FakeRobot {
  readonly sent: string[] = [];
  connections = 0;
  private sockets: WebSocketRoute[] = [];
  /** Frames sent to every new connection, like the firmware's STATE after connect. */
  greeting: string[] = [stateFrame()];

  async install(page: Page): Promise<void> {
    await page.addInitScript((url) => {
      if (localStorage.getItem('robotUrl') === null) {
        localStorage.setItem('robotUrl', url);
      }
    }, ROBOT_URL);
    await page.routeWebSocket(/^ws:\/\/robot\.test/, (ws) => {
      this.connections++;
      this.sockets.push(ws);
      ws.onMessage((message) => this.sent.push(String(message)));
      for (const frame of this.greeting) {
        ws.send(frame);
      }
    });
  }

  /** Sends a frame to the app on the newest connection. */
  send(...frames: string[]): void {
    const socket = this.sockets[this.sockets.length - 1];
    for (const frame of frames) {
      socket.send(frame);
    }
  }

  /** The robot drops the connection (the app reconnects by itself). */
  drop(): void {
    this.sockets[this.sockets.length - 1]?.close();
  }

  clearSent(): void {
    this.sent.length = 0;
  }

  async expectSent(...frames: string[]): Promise<void> {
    await expect
      .poll(() => this.sent.filter((f) => frames.includes(f)).length, {
        message: `waiting for ${frames}`,
      })
      .toBeGreaterThan(0);
  }

  count(frame: string): number {
    return this.sent.filter((f) => f === frame).length;
  }
}

type Fixtures = { robot: FakeRobot; app: Page; offlineApp: Page };

export const test = base.extend<Fixtures>({
  robot: async ({ page }, use) => {
    const robot = new FakeRobot();
    await robot.install(page);
    await use(robot);
  },
  /** The app, opened and connected to the fake robot. */
  app: async ({ page, robot }, use) => {
    await page.goto('/');
    await expect.poll(() => robot.connections).toBeGreaterThan(0);
    await expect(page.locator('.connection-banner')).toBeHidden();
    await use(page);
  },
  /** The app pointed at a port nobody listens on: it stays disconnected (and keeps retrying). */
  offlineApp: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('robotUrl', 'ws://127.0.0.1:1'));
    await page.goto('/');
    await expect(page.locator('.connection-banner')).toBeVisible();
    await use(page);
  },
});

export { expect };

/** Canvas contents as a data URL: equal strings mean identical pictures. */
export const canvasPicture = (canvas: Locator): Promise<string> =>
  canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());

/** Number of pixels within `tolerance` (per channel) of the colour. */
export const countColour = (
  canvas: Locator,
  [r, g, b]: [number, number, number],
  tolerance = 12,
): Promise<number> =>
  canvas.evaluate(
    (el, [r, g, b, tol]) => {
      const c = el as HTMLCanvasElement;
      const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.abs(data[i] - r) <= tol &&
          Math.abs(data[i + 1] - g) <= tol &&
          Math.abs(data[i + 2] - b) <= tol
        ) {
          n++;
        }
      }
      return n;
    },
    [r, g, b, tolerance] as [number, number, number, number],
  );

/** Opens a collapsible panel (Pose, Raw log), which start collapsed. */
export const expand = async (page: Page, panel: 'pose-display' | 'log-panel'): Promise<void> => {
  const details = page.locator(`${panel} details`);
  if ((await details.getAttribute('open')) === null) {
    await details.locator('summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
};
