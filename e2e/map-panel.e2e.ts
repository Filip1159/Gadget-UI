import { Locator, Page } from '@playwright/test';
import {
  canvasPicture,
  countColour,
  expect,
  FakeRobot,
  measureFrame,
  poseFrame,
  test,
} from './fixtures';

const TRAIL: [number, number, number] = [0x4f, 0xc3, 0xf7];
const POINT: [number, number, number] = [0xff, 0xd5, 0x4f];

const sweepPose = (dx = 0) => `SWEEP_POSE T0=1000 X0=0 Y0=0 TH0=0 T1=1390 X1=${dx} Y1=0 TH1=0`;

/** A posed sweep: the robot at the origin and every sensor reading `mm`. */
const sendSweep = (robot: FakeRobot, mm = 250, movedMm = 0) =>
  robot.send(sweepPose(movedMm), measureFrame(mm));

const sendDrive = (robot: FakeRobot) =>
  robot.send(poseFrame(0, 0), poseFrame(150, 0), poseFrame(300, 100));

const map = (page: Page): Locator => page.locator('map-panel canvas');
const option = (page: Page, name: string): Locator => page.locator('map-panel').getByLabel(name);
const points = (page: Page) => countColour(map(page), POINT);
const trail = (page: Page) => countColour(map(page), TRAIL);

test.describe('map panel', () => {
  test('has the default layer options', async ({ app }) => {
    await expect(option(app, 'Grid')).toBeChecked();
    await expect(option(app, 'Trail')).toBeChecked();
    await expect(option(app, 'Points')).toBeChecked();
    await expect(option(app, 'Rays')).not.toBeChecked();
    await expect(option(app, 'Stationary sweeps only')).not.toBeChecked();
    await expect(app.locator('map-panel input[type=number]').nth(0)).toHaveValue('0');
    await expect(app.locator('map-panel input[type=number]').nth(1)).toHaveValue('1000');
  });

  test('draws the path the robot drove', async ({ app, robot }) => {
    expect(await trail(app)).toBe(0);
    sendDrive(robot);
    await expect.poll(() => trail(app)).toBeGreaterThan(0);
  });

  test('draws obstacle points from a sweep', async ({ app, robot }) => {
    expect(await points(app)).toBe(0);
    sendSweep(robot);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
  });

  test('ignores a sweep without a SWEEP_POSE', async ({ app, robot }) => {
    robot.send(measureFrame(250));
    await app.waitForTimeout(400);
    expect(await points(app)).toBe(0);
  });

  test('the Trail checkbox hides and shows the path', async ({ app, robot }) => {
    sendDrive(robot);
    await expect.poll(() => trail(app)).toBeGreaterThan(0);
    await option(app, 'Trail').uncheck();
    await expect.poll(() => trail(app)).toBe(0);
    await option(app, 'Trail').check();
    await expect.poll(() => trail(app)).toBeGreaterThan(0);
  });

  test('the Points checkbox hides and shows the points', async ({ app, robot }) => {
    sendSweep(robot);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
    await option(app, 'Points').uncheck();
    await expect.poll(() => points(app)).toBe(0);
    await option(app, 'Points').check();
    await expect.poll(() => points(app)).toBeGreaterThan(0);
  });

  test('the Grid checkbox changes the picture', async ({ app }) => {
    const withGrid = await canvasPicture(map(app));
    await option(app, 'Grid').uncheck();
    await expect.poll(() => canvasPicture(map(app))).not.toBe(withGrid);
    await option(app, 'Grid').check();
    await expect.poll(() => canvasPicture(map(app))).toBe(withGrid);
  });

  test('the Rays checkbox draws the beams of the latest sweep', async ({ app, robot }) => {
    sendSweep(robot);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
    await option(app, 'Points').uncheck();
    const without = await canvasPicture(map(app));
    await option(app, 'Rays').check();
    await expect.poll(() => canvasPicture(map(app))).not.toBe(without);
  });

  test('Clear map forgets the path and the points', async ({ app, robot }) => {
    sendDrive(robot);
    sendSweep(robot);
    await expect.poll(() => trail(app)).toBeGreaterThan(0);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
    await app.getByRole('button', { name: 'Clear map' }).click();
    await expect.poll(() => trail(app)).toBe(0);
    await expect.poll(() => points(app)).toBe(0);
  });

  test('"Stationary sweeps only" drops sweeps taken while moving', async ({ app, robot }) => {
    await option(app, 'Stationary sweeps only').check();
    sendSweep(robot, 250, 100); // moved 100 mm during the sweep
    await app.waitForTimeout(400);
    expect(await points(app)).toBe(0);
    sendSweep(robot, 250, 0);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
  });

  test('moving sweeps are kept without the stationary filter', async ({ app, robot }) => {
    sendSweep(robot, 250, 100);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
  });

  test('the range filter ignores readings outside the range', async ({ app, robot }) => {
    const max = app.locator('map-panel input[type=number]').nth(1);
    await max.fill('200');
    await max.blur();
    sendSweep(robot, 250);
    await app.waitForTimeout(400);
    expect(await points(app)).toBe(0);
    sendSweep(robot, 150);
    await expect.poll(() => points(app)).toBeGreaterThan(0);
  });

  test('the minimum range filter ignores close readings', async ({ app, robot }) => {
    const min = app.locator('map-panel input[type=number]').nth(0);
    await min.fill('300');
    await min.blur();
    sendSweep(robot, 250);
    await app.waitForTimeout(400);
    expect(await points(app)).toBe(0);
  });

  test('dragging pans the map and Recentre brings it back', async ({ app }) => {
    const canvas = map(app);
    const home = await canvasPicture(canvas);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await app.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await app.mouse.down();
    await app.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 60, { steps: 5 });
    await app.mouse.up();
    await expect.poll(() => canvasPicture(canvas)).not.toBe(home);
    await app.getByRole('button', { name: 'Recentre' }).click();
    await expect.poll(() => canvasPicture(canvas)).toBe(home);
  });

  test('the mouse wheel zooms and Recentre resets the zoom', async ({ app }) => {
    const canvas = map(app);
    const home = await canvasPicture(canvas);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await app.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await app.mouse.wheel(0, -300);
    await expect.poll(() => canvasPicture(canvas)).not.toBe(home);
    const zoomedIn = await canvasPicture(canvas);
    await app.mouse.wheel(0, 600);
    await expect.poll(() => canvasPicture(canvas)).not.toBe(zoomedIn);
    await app.getByRole('button', { name: 'Recentre' }).click();
    await expect.poll(() => canvasPicture(canvas)).toBe(home);
  });

  test('the map is cleared when the connection drops', async ({ app, robot }) => {
    robot.greeting = [];
    sendDrive(robot);
    sendSweep(robot);
    await expect.poll(() => trail(app)).toBeGreaterThan(0);
    robot.drop();
    await expect.poll(() => trail(app)).toBe(0);
    await expect.poll(() => points(app)).toBe(0);
  });
});
