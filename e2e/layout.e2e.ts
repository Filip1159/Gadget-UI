import { expect, poseFrame, test } from './fixtures';

test.describe('collapsible panels', () => {
  for (const panel of ['pose-display', 'log-panel']) {
    test(`${panel} is collapsed by default and toggles on click`, async ({ app }) => {
      const details = app.locator(`${panel} details`);
      await expect(details).not.toHaveAttribute('open', '');
      await expect(details.locator('summary')).toBeVisible();
      await expect(details.getByRole('button', { name: /Reset pose|Record/ })).toBeHidden();
      await details.locator('summary').click();
      await expect(details.getByRole('button', { name: /Reset pose|Record/ })).toBeVisible();
      await details.locator('summary').click();
      await expect(details.getByRole('button', { name: /Reset pose|Record/ })).toBeHidden();
    });
  }

  test('the collapsed Pose panel still shows the current pose', async ({ app, robot }) => {
    const summary = app.locator('pose-display summary');
    await expect(summary).toContainText('\u2014');
    robot.send(poseFrame(120, -40, 1571));
    await expect(summary).toContainText('120, -40 mm');
    await expect(summary).toContainText('90\u00b0');
  });

  test('the collapsed Raw log panel shows that it is recording', async ({ app }) => {
    await app.locator('log-panel summary').click();
    await app.getByRole('button', { name: 'Record' }).click();
    await app.locator('log-panel summary').click();
    await expect(app.locator('log-panel summary')).toContainText('Recording');
  });
});

test.describe('layout', () => {
  const width = (page: import('@playwright/test').Page, selector: string) =>
    page.locator(selector).evaluate((el) => el.getBoundingClientRect().width);

  test('the map is in the left column and the sensors above the tabs on the right', async ({
    app,
  }) => {
    const map = (await app.locator('map-panel').boundingBox())!;
    const sensors = (await app.locator('robot-preview').boundingBox())!;
    const tabs = (await app.getByRole('tablist').boundingBox())!;
    expect(map.x).toBeLessThan(sensors.x);
    expect(sensors.y).toBeLessThan(tabs.y);
    expect(Math.abs(sensors.x - tabs.x)).toBeLessThan(2);
  });

  test('the sensor canvas is about half the size of the map canvas', async ({ app }) => {
    const sensors = await width(app, 'robot-preview canvas');
    const map = await width(app, 'map-panel canvas');
    expect(sensors / map).toBeGreaterThan(0.4);
    expect(sensors / map).toBeLessThan(0.6);
  });

  test('shows a legend for the range colours', async ({ app }) => {
    await expect(app.locator('robot-preview')).toContainText('< 100 mm');
    await expect(app.locator('robot-preview')).toContainText('> 300 mm');
  });

  test('nothing overflows the viewport horizontally', async ({ app }) => {
    for (const size of [
      { width: 1280, height: 720 },
      { width: 800, height: 900 },
      { width: 390, height: 800 },
    ]) {
      await app.setViewportSize(size);
      expect(await app.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
});
