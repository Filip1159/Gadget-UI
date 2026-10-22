import { expand, expect, poseFrame, ROBOT_URL, stateFrame, test } from './fixtures';

test.describe('header', () => {
  test('shows the app title', async ({ app }) => {
    await expect(app.getByRole('heading', { level: 1, name: 'Gadget' })).toBeVisible();
  });

  test('shows the logo, loaded from the app', async ({ app }) => {
    const logo = app.locator('.header__logo');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test('uses the logo as the favicon', async ({ app, request }) => {
    const href = await app.locator('link[rel=icon][type="image/svg+xml"]').getAttribute('href');
    expect(href).toBe('logo.svg');
    const response = await request.get('/' + href);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('<svg');
    expect((await request.get('/favicon.ico')).ok()).toBe(true);
  });
});

test.describe('connection', () => {
  test('connects to the saved robot URL and hides the banner', async ({ app, robot }) => {
    await expect(app.locator('.connection-banner')).toBeHidden();
    expect(robot.connections).toBe(1);
  });

  test('shows the banner while the robot is unreachable', async ({ offlineApp }) => {
    const banner = offlineApp.locator('.connection-banner');
    await expect(banner).toContainText('ws://127.0.0.1:1');
    await expect(banner.getByLabel('Robot WebSocket URL')).toHaveValue('ws://127.0.0.1:1');
  });

  test('reconnects by itself after the robot drops the connection', async ({ app, robot }) => {
    robot.drop();
    await expect(app.locator('.connection-banner')).toBeVisible();
    await expect.poll(() => robot.connections).toBe(2);
    await expect(app.locator('.connection-banner')).toBeHidden();
  });

  test('connects to a URL typed into the banner and remembers it', async ({
    page,
    robot,
    offlineApp,
  }) => {
    const banner = offlineApp.locator('.connection-banner');
    await banner.getByLabel('Robot WebSocket URL').fill(ROBOT_URL);
    await banner.getByRole('button', { name: 'Connect' }).click();
    await expect.poll(() => robot.connections).toBe(1);
    await expect(banner).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('robotUrl'))).toBe(ROBOT_URL);
  });

  test('Enter in the URL field connects too', async ({ robot, offlineApp }) => {
    const input = offlineApp.getByLabel('Robot WebSocket URL');
    await input.fill(ROBOT_URL);
    await input.press('Enter');
    await expect.poll(() => robot.connections).toBe(1);
  });

  test('an invalid URL is not accepted', async ({ robot, offlineApp }) => {
    const banner = offlineApp.locator('.connection-banner');
    await banner.getByLabel('Robot WebSocket URL').fill('http://not-a-websocket');
    await banner.getByRole('button', { name: 'Connect' }).click();
    await expect(banner).toBeVisible();
    expect(robot.connections).toBe(0);
    expect(await offlineApp.evaluate(() => localStorage.getItem('robotUrl'))).toBe(
      'ws://127.0.0.1:1',
    );
  });

  test('sends the saved token as the very first frame', async ({ page, robot }) => {
    await page.addInitScript(() => localStorage.setItem('robotToken', 'secret'));
    await page.goto('/');
    await robot.expectSent('AUTH secret');
    expect(robot.sent[0]).toBe('AUTH secret');
  });

  test('a token typed into the banner is saved and sent', async ({ page, robot, offlineApp }) => {
    const banner = offlineApp.locator('.connection-banner');
    await banner.getByLabel('Robot WebSocket URL').fill(ROBOT_URL);
    await banner.getByLabel('Robot token').fill('hunter2');
    await banner.getByRole('button', { name: 'Connect' }).click();
    await robot.expectSent('AUTH hunter2');
    expect(robot.sent[0]).toBe('AUTH hunter2');
    expect(await page.evaluate(() => localStorage.getItem('robotToken'))).toBe('hunter2');
  });

  test('no AUTH frame without a token', async ({ app, robot }) => {
    await app.waitForTimeout(200);
    expect(robot.sent.some((f) => f.startsWith('AUTH'))).toBe(false);
  });
});

test.describe('robot error banner', () => {
  test('shows the rejection reason and clears it after a few seconds', async ({ app, robot }) => {
    robot.send('ERR busy moving');
    const banner = app.getByRole('alert');
    await expect(banner).toHaveText('Robot rejected a command: busy moving');
    await expect(banner).toBeHidden({ timeout: 7000 });
  });

  test('ignores malformed frames', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send('GARBAGE 1 2 3', 'MEASURE FRONT=abc', 'POSE X=1');
    await app.waitForTimeout(200);
    await expect(app.getByRole('alert')).toBeHidden();
    await expect(app.getByText('No pose yet')).toBeVisible();
  });
});

test.describe('state after reconnect', () => {
  test('the robot state replaces the UI settings on every connect', async ({ app, robot }) => {
    robot.greeting = [stateFrame({ speed: 1700, measuring: true })];
    robot.drop();
    await expect.poll(() => robot.connections).toBe(2);
    await expect(app.locator('input.slider')).toHaveValue('1700');
    await expect(app.getByRole('button', { name: 'Stop Measuring' })).toBeVisible();
  });

  test('pose and map state are discarded when the connection drops', async ({ app, robot }) => {
    robot.greeting = []; // no new pose after the reconnect
    await expand(app, 'pose-display');
    robot.send(poseFrame(120, 40));
    await expect(app.getByText('120 mm')).toBeVisible();
    robot.drop();
    await expect(app.getByText('No pose yet')).toBeVisible();
  });
});
