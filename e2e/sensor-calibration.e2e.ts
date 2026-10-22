import { readFile } from 'node:fs/promises';
import { Page } from '@playwright/test';
import { canvasPicture, countColour, expect, measureFrame, test } from './fixtures';

const calFrame = (distance: number, index: number, total: number, mm = 300) =>
  `CAL ${distance} ${index}/${total} ${measureFrame(mm).replace('MEASURE ', '')}`;

/** Opens the Calibration tab and returns the panel. */
const calibration = async (page: Page) => {
  await page.getByRole('tab', { name: 'Calibration' }).click();
  return page.locator('sensor-calibration');
};

test.describe('sensor calibration', () => {
  test('has the defaults and offers every sensor plus ALL', async ({ app }) => {
    const p = await calibration(app);
    await expect(p.getByRole('heading', { name: 'Sensor calibration' })).toBeVisible();
    await expect(p.getByLabel('Distance (mm)')).toHaveValue('300');
    await expect(p.getByLabel('Sweeps')).toHaveValue('100');
    const options = await p.getByLabel('Sensor').locator('option').allTextContents();
    expect(options).toHaveLength(11);
    expect(options).toContain('FRONT');
    expect(options).toContain('BACK_RIGHT_45');
    expect(options.at(-1)).toBe('ALL');
    await expect(p.getByText('0 sweeps recorded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  test('Start sends CAL with the distance and sweep count', async ({ app, robot }) => {
    const p = await calibration(app);
    await p.getByLabel('Distance (mm)').fill('600');
    await p.getByLabel('Sweeps').fill('3');
    await p.getByRole('button', { name: 'Start' }).click();
    await robot.expectSent('CAL 600 3');
    await expect(p.getByText(/Recording 0 \/ 3/)).toBeVisible();
  });

  for (const [name, field, value] of [
    ['a zero distance', 'Distance (mm)', '0'],
    ['a distance above the limit', 'Distance (mm)', '2001'],
    ['a fractional distance', 'Distance (mm)', '10.5'],
    ['an empty distance', 'Distance (mm)', ''],
    ['zero sweeps', 'Sweeps', '0'],
    ['too many sweeps', 'Sweeps', '501'],
    ['an empty sweep count', 'Sweeps', ''],
  ]) {
    test(`Start is disabled for ${name}`, async ({ app }) => {
      const p = await calibration(app);
      await p.getByLabel(field).fill(value);
      await expect(p.getByRole('button', { name: 'Start' })).toBeDisabled();
    });
  }

  test('Start is disabled while disconnected', async ({ offlineApp }) => {
    await expect(
      (await calibration(offlineApp)).getByRole('button', { name: 'Start' }),
    ).toBeDisabled();
  });

  test('records the streamed sweeps, locks the form and finishes on CAL_DONE', async ({
    app,
    robot,
  }) => {
    const p = await calibration(app);
    await p.getByLabel('Sweeps').fill('3');
    await p.getByRole('button', { name: 'Start' }).click();
    await robot.expectSent('CAL 300 3');

    robot.send(calFrame(300, 1, 3));
    await expect(p.getByText(/Recording 1 \/ 3/)).toBeVisible();
    await expect(p.getByText(/1 sweeps recorded/)).toBeVisible();
    await expect(p.getByLabel('Sensor')).toBeDisabled();
    await expect(p.getByLabel('Distance (mm)')).toBeDisabled();
    await expect(p.getByLabel('Sweeps')).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Clear' })).toBeDisabled();

    robot.send(calFrame(300, 2, 3), calFrame(300, 3, 3), 'CAL_DONE 300 3');
    await expect(p.getByText('3 sweeps recorded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Start' })).toBeEnabled();
    await expect(p.getByLabel('Sweeps')).toBeEnabled();
    await expect(p.getByRole('button', { name: 'Clear' })).toBeEnabled();
  });

  test('Stop sends CAL_STOP', async ({ app, robot }) => {
    const p = await calibration(app);
    await p.getByRole('button', { name: 'Start' }).click();
    await p.getByRole('button', { name: 'Stop' }).click();
    await robot.expectSent('CAL_STOP');
    robot.send('CAL_DONE 300 0');
    await expect(p.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  test('a rejected run (ERR) unlocks the form', async ({ app, robot }) => {
    const p = await calibration(app);
    await p.getByRole('button', { name: 'Start' }).click();
    await expect(p.getByRole('button', { name: 'Stop' })).toBeVisible();
    robot.send('ERR robot is moving');
    await expect(p.getByRole('button', { name: 'Start' })).toBeEnabled();
    await expect(app.getByRole('alert')).toContainText('robot is moving');
  });

  test('losing the connection ends the run', async ({ app, robot }) => {
    const p = await calibration(app);
    await p.getByRole('button', { name: 'Start' }).click();
    await expect(p.getByRole('button', { name: 'Stop' })).toBeVisible();
    robot.drop();
    await expect(p.getByRole('button', { name: 'Stop' })).toBeHidden();
  });

  test('downloads the recorded sweeps as CSV and Clear forgets them', async ({ app, robot }) => {
    const p = await calibration(app);
    await p.getByLabel('Sensor').selectOption('FRONT_LEFT');
    await p.getByLabel('Sweeps').fill('2');
    await p.getByRole('button', { name: 'Start' }).click();
    await robot.expectSent('CAL 300 2');
    robot.send(calFrame(300, 1, 2, 301), calFrame(300, 2, 2, 302), 'CAL_DONE 300 2');
    await expect(p.getByText('2 sweeps recorded')).toBeVisible();

    const [download] = await Promise.all([
      app.waitForEvent('download'),
      p.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^sensor-calibration-.*\.csv$/);
    const csv = await readFile((await download.path())!, 'utf8');
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 sweeps
    expect(csv).toContain('FRONT_LEFT');
    expect(csv).toContain('301');
    expect(csv).toContain('302');

    await p.getByRole('button', { name: 'Clear' }).click();
    await expect(p.getByText('0 sweeps recorded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
  });

  test('the robot preview shows calibration sweeps live and measuring is switched off', async ({
    app,
    robot,
  }) => {
    const canvas = app.locator('robot-preview canvas');
    await app.getByRole('button', { name: 'Start Measuring' }).click();
    await expect(app.getByRole('button', { name: 'Stop Measuring' })).toBeVisible();
    const blank = await canvasPicture(canvas);
    robot.send(calFrame(300, 1, 2, 50));
    await expect(app.getByRole('button', { name: 'Start Measuring' })).toBeVisible();
    await expect.poll(() => countColour(canvas, [255, 0, 0])).toBeGreaterThan(0);
    expect(await canvasPicture(canvas)).not.toBe(blank);
  });
});
