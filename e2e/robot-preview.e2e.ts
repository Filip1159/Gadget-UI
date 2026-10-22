import { canvasPicture, countColour, expect, measureFrame, stateFrame, test } from './fixtures';

const RED: [number, number, number] = [255, 0, 0];
const YELLOW: [number, number, number] = [255, 255, 0];
const GREEN: [number, number, number] = [0, 128, 0];

test.describe('measure toggle', () => {
  test('starts idle', async ({ app }) => {
    const button = app.getByRole('button', { name: 'Start Measuring' });
    await expect(button).toBeVisible();
    await expect(button).not.toHaveClass(/measuring/);
  });

  test('Start Measuring sends MEASURE_START and flips the button', async ({ app, robot }) => {
    await app.getByRole('button', { name: 'Start Measuring' }).click();
    await robot.expectSent('MEASURE_START');
    const button = app.getByRole('button', { name: 'Stop Measuring' });
    await expect(button).toHaveClass(/measuring/);
    await button.click();
    await robot.expectSent('MEASURE_STOP');
    await expect(app.getByRole('button', { name: 'Start Measuring' })).toBeVisible();
  });

  test('follows the robot STATE after connect', async ({ page, robot }) => {
    robot.greeting = [stateFrame({ measuring: true })];
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Stop Measuring' })).toBeVisible();
  });

  test('does nothing while disconnected', async ({ offlineApp }) => {
    await offlineApp.getByRole('button', { name: 'Start Measuring' }).click();
    await expect(offlineApp.getByRole('button', { name: 'Start Measuring' })).toBeVisible();
  });
});

test.describe('robot preview canvas', () => {
  test('draws a sweep and colours it by distance', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    const blank = await canvasPicture(canvas);
    expect(await countColour(canvas, RED)).toBe(0);

    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    expect(await canvasPicture(canvas)).not.toBe(blank);

    robot.send(measureFrame(250));
    await expect.poll(() => countColour(canvas, YELLOW)).toBeGreaterThan(0);
    await expect.poll(() => countColour(canvas, RED)).toBe(0);
  });

  test('draws out-of-range sensors as a green outline', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    robot.send(measureFrame('OOR'));
    await expect.poll(() => countColour(canvas, GREEN)).toBeGreaterThan(0);
  });

  test('a new sweep replaces the previous one', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    const near = await canvasPicture(canvas);
    robot.send(measureFrame(400));
    await expect.poll(() => canvasPicture(canvas)).not.toBe(near);
  });

  test('a malformed MEASURE frame leaves the picture alone', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    const before = await canvasPicture(canvas);
    robot.send('MEASURE FRONT=100 NOPE=3');
    await app.waitForTimeout(300);
    expect(await canvasPicture(canvas)).toBe(before);
  });

  test('stopping measurement clears the readings', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    await app.getByRole('button', { name: 'Start Measuring' }).click();
    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    await app.getByRole('button', { name: 'Stop Measuring' }).click();
    await expect.poll(() => countColour(canvas, RED)).toBe(0);
  });

  test('readings that stop arriving are dropped after about 3 seconds', async ({ app, robot }) => {
    const canvas = app.locator('robot-preview canvas');
    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    await expect.poll(() => countColour(canvas, RED), { timeout: 6000 }).toBe(0);
  });

  test('readings are cleared when the connection drops', async ({ app, robot }) => {
    robot.greeting = [];
    const canvas = app.locator('robot-preview canvas');
    robot.send(measureFrame(50));
    await expect.poll(() => countColour(canvas, RED)).toBeGreaterThan(0);
    robot.drop();
    await expect.poll(() => countColour(canvas, RED)).toBe(0);
  });

  test('is HiDPI aware: the backing store is 600 logical pixels times the device pixel ratio', async ({
    app,
  }) => {
    const size = await app
      .locator('robot-preview canvas')
      .evaluate((el) => (el as HTMLCanvasElement).width);
    const dpr = await app.evaluate(() => window.devicePixelRatio);
    expect(size).toBe(600 * dpr);
  });
});
