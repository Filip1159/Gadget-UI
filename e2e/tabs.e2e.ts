import { expect, test } from './fixtures';

test.describe('tabs', () => {
  test('Drive is selected first and Calibration is hidden', async ({ app }) => {
    await expect(app.getByRole('tab', { name: 'Drive' })).toHaveAttribute('aria-selected', 'true');
    await expect(app.getByRole('tab', { name: 'Calibration' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(app.locator('steering')).toBeVisible();
    await expect(app.locator('pose-display')).toBeVisible();
    await expect(app.locator('log-panel')).toBeVisible();
    await expect(app.locator('sensor-calibration')).toBeHidden();
  });

  test('the Calibration tab shows only the calibration panel', async ({ app }) => {
    await app.getByRole('tab', { name: 'Calibration' }).click();
    await expect(app.locator('sensor-calibration')).toBeVisible();
    await expect(app.locator('steering')).toBeHidden();
    await expect(app.locator('pose-display')).toBeHidden();
    await expect(app.locator('log-panel')).toBeHidden();
  });

  test('the map and the sensor preview stay visible on both tabs', async ({ app }) => {
    for (const tab of ['Drive', 'Calibration']) {
      await app.getByRole('tab', { name: tab }).click();
      await expect(app.locator('map-panel')).toBeVisible();
      await expect(app.locator('robot-preview')).toBeVisible();
    }
  });

  test('arrow keys move between tabs', async ({ app }) => {
    await app.getByRole('tab', { name: 'Drive' }).focus();
    await app.keyboard.press('ArrowRight');
    await expect(app.getByRole('tab', { name: 'Calibration' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await app.keyboard.press('ArrowRight');
    await expect(app.getByRole('tab', { name: 'Drive' })).toHaveAttribute('aria-selected', 'true');
    await app.keyboard.press('End');
    await expect(app.getByRole('tab', { name: 'Calibration' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('a calibration run keeps going while another tab is open', async ({ app, robot }) => {
    const panel = app.locator('sensor-calibration');
    await app.getByRole('tab', { name: 'Calibration' }).click();
    await panel.getByLabel('Sweeps').fill('3');
    await panel.getByRole('button', { name: 'Start' }).click();
    await robot.expectSent('CAL 300 3');
    await app.getByRole('tab', { name: 'Drive' }).click();
    await app.getByRole('tab', { name: 'Calibration' }).click();
    await expect(panel.getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(panel.getByLabel('Sweeps')).toHaveValue('3');
  });

  test('the steering keys still work on the Calibration tab', async ({ app, robot }) => {
    await app.getByRole('tab', { name: 'Calibration' }).click();
    await app.keyboard.press('s');
    await robot.expectSent('STOP');
  });
});

test.describe('connection indicator', () => {
  test('shows Online when connected', async ({ app }) => {
    await expect(app.getByRole('status')).toHaveText('Online');
  });

  test('shows Offline when the robot is unreachable', async ({ offlineApp }) => {
    await expect(offlineApp.getByRole('status')).toHaveText(/Offline|Connecting/);
  });
});
