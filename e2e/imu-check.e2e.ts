import { Page } from '@playwright/test';
import { expect, test } from './fixtures';

/** Opens the Calibration tab and returns the IMU panel. */
const imuPanel = async (page: Page) => {
  await page.getByRole('tab', { name: 'Calibration' }).click();
  return page.locator('imu-check');
};

test.describe('IMU orientation check', () => {
  test('Run check sends IMU_CHECK and shows the running state', async ({ app, robot }) => {
    const p = await imuPanel(app);
    await expect(p.getByRole('heading', { name: 'IMU orientation' })).toBeVisible();
    await p.getByRole('button', { name: 'Run check' }).click();
    await robot.expectSent('IMU_CHECK');
    await expect(p.getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(p.getByRole('status')).toContainText('Checking');
  });

  test('shows the detected axes when the check succeeds', async ({ app, robot }) => {
    const p = await imuPanel(app);
    await p.getByRole('button', { name: 'Run check' }).click();
    robot.send('IMU_ORIENT RESULT=ok UP=-Z YAW=-Z TILT=3 RATE=84');
    await expect(p.getByRole('status')).toContainText('Orientation found');
    await expect(p.locator('dd').nth(0)).toHaveText('-Z');
    await expect(p.locator('dd').nth(1)).toHaveText('-Z');
    await expect(p.locator('dd').nth(2)).toContainText('3');
    await expect(p.locator('dd').nth(3)).toContainText('84');
    await expect(p.getByRole('button', { name: 'Run check' })).toBeEnabled();
  });

  test('explains a failed check', async ({ app, robot }) => {
    const p = await imuPanel(app);
    await p.getByRole('button', { name: 'Run check' }).click();
    robot.send('IMU_ORIENT RESULT=inconsistent UP=+Z YAW=-Z TILT=1 RATE=90');
    await expect(p.getByRole('status')).toContainText('disagree');
    await expect(p.getByText('Up +Z, yaw -Z')).toBeVisible();
    await expect(p.locator('dl')).toBeHidden();
  });

  test('Stop sends IMU_CHECK_STOP and the aborted answer ends the check', async ({
    app,
    robot,
  }) => {
    const p = await imuPanel(app);
    await p.getByRole('button', { name: 'Run check' }).click();
    await p.getByRole('button', { name: 'Stop' }).click();
    await robot.expectSent('IMU_CHECK_STOP');
    robot.send('IMU_ORIENT RESULT=aborted UP=? YAW=? TILT=0 RATE=0');
    await expect(p.getByRole('button', { name: 'Run check' })).toBeVisible();
    await expect(p.getByRole('status')).toContainText('Stopped');
  });

  test('a rejected check (ERR) ends the running state', async ({ app, robot }) => {
    const p = await imuPanel(app);
    await p.getByRole('button', { name: 'Run check' }).click();
    robot.send('ERR imu offline');
    await expect(p.getByRole('button', { name: 'Run check' })).toBeEnabled();
    await expect(app.getByRole('alert')).toContainText('imu offline');
  });

  test('Run check is disabled while disconnected', async ({ offlineApp }) => {
    await expect(
      (await imuPanel(offlineApp)).getByRole('button', { name: 'Run check' }),
    ).toBeDisabled();
  });
});
