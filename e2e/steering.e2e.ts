import { expect, stateFrame, test } from './fixtures';

const BUTTONS: Record<string, string> = {
  'Forward Left': 'FORWARD_LEFT',
  Forward: 'FORWARD',
  'Forward Right': 'FORWARD_RIGHT',
  Left: 'LEFT',
  Right: 'RIGHT',
  'Backward Left': 'BACKWARD_LEFT',
  Backward: 'BACKWARD',
  'Backward Right': 'BACKWARD_RIGHT',
};

const KEYS: Record<string, string> = {
  w: 'FORWARD',
  q: 'FORWARD_LEFT',
  e: 'FORWARD_RIGHT',
  a: 'LEFT',
  d: 'RIGHT',
  x: 'BACKWARD',
  z: 'BACKWARD_LEFT',
  c: 'BACKWARD_RIGHT',
};

test.describe('direction buttons', () => {
  for (const [label, direction] of Object.entries(BUTTONS)) {
    test(`${label}: sends ${direction} on press and STOP on release`, async ({ app, robot }) => {
      const button = app.getByRole('button', { name: label, exact: true });
      await button.scrollIntoViewIfNeeded();
      const box = (await button.boundingBox())!;
      await app.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await app.mouse.down();
      await robot.expectSent(direction);
      expect(robot.sent).toEqual([direction]);
      await app.mouse.up();
      await robot.expectSent('STOP');
      expect(robot.sent).toEqual([direction, 'STOP']);
    });
  }

  test('a held button repeats its direction every 500ms', async ({ app, robot }) => {
    const forward = app.getByRole('button', { name: 'Forward', exact: true });
    await forward.scrollIntoViewIfNeeded();
    const box = (await forward.boundingBox())!;
    await app.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await app.mouse.down();
    await expect.poll(() => robot.count('FORWARD'), { timeout: 3000 }).toBeGreaterThanOrEqual(3);
    await app.mouse.up();
    await robot.expectSent('STOP');
    const count = robot.count('FORWARD');
    await app.waitForTimeout(800);
    expect(robot.count('FORWARD')).toBe(count); // no more heartbeat after release
  });

  test('the Stop button sends STOP', async ({ app, robot }) => {
    await app.getByRole('button', { name: 'Stop', exact: true }).click();
    await robot.expectSent('STOP');
  });

  test('direction buttons are disabled while disconnected, Stop is not', async ({ offlineApp }) => {
    for (const label of Object.keys(BUTTONS)) {
      await expect(offlineApp.getByRole('button', { name: label, exact: true })).toBeDisabled();
    }
    await expect(offlineApp.getByRole('button', { name: 'Stop', exact: true })).toBeEnabled();
  });
});

test.describe('keyboard steering', () => {
  for (const [key, direction] of Object.entries(KEYS)) {
    test(`${key} drives ${direction} while held, then stops`, async ({ app, robot }) => {
      await app.keyboard.down(key);
      await robot.expectSent(direction);
      await app.keyboard.up(key);
      await robot.expectSent('STOP');
      expect(robot.sent).toEqual([direction, 'STOP']);
    });
  }

  test('a held key repeats as a heartbeat', async ({ app, robot }) => {
    await app.keyboard.down('w');
    await expect.poll(() => robot.count('FORWARD'), { timeout: 3000 }).toBeGreaterThanOrEqual(3);
    await app.keyboard.up('w');
  });

  test('releasing one of two held keys falls back to the other', async ({ app, robot }) => {
    await app.keyboard.down('w');
    await app.keyboard.down('d');
    await app.keyboard.up('d');
    await app.keyboard.up('w');
    await robot.expectSent('STOP');
    expect(robot.sent).toEqual(['FORWARD', 'RIGHT', 'FORWARD', 'STOP']);
  });

  for (const key of ['s', 'Space', 'Escape']) {
    test(`${key} stops a moving robot`, async ({ app, robot }) => {
      await app.keyboard.down('w');
      await robot.expectSent('FORWARD');
      await app.keyboard.press(key);
      await robot.expectSent('STOP');
      const count = robot.count('FORWARD');
      await app.waitForTimeout(800);
      expect(robot.count('FORWARD')).toBe(count);
      await app.keyboard.up('w');
    });
  }

  test('losing window focus stops the robot', async ({ app, robot }) => {
    await app.keyboard.down('w');
    await robot.expectSent('FORWARD');
    await app.evaluate(() => window.dispatchEvent(new Event('blur')));
    await robot.expectSent('STOP');
  });

  test('keys typed into an input are not steering', async ({ app, robot }) => {
    await app.locator('#P').focus();
    await app.keyboard.press('w');
    await app.keyboard.press('Space');
    await app.waitForTimeout(200);
    expect(robot.sent).toEqual([]);
  });

  test('Ctrl combinations are ignored', async ({ app, robot }) => {
    await app.keyboard.press('Control+w');
    await app.waitForTimeout(200);
    expect(robot.sent).toEqual([]);
  });
});

test.describe('speed slider', () => {
  test('starts at the default speed', async ({ app }) => {
    await expect(app.locator('input.slider')).toHaveValue('1000');
  });

  test('sends SPEED with the final value', async ({ app, robot }) => {
    await app.locator('input.slider').fill('500');
    await expect.poll(() => robot.sent.at(-1)).toBe('SPEED 500');
  });

  test('snaps to the 100 step and covers the 0 to 2000 range', async ({ app, robot }) => {
    const slider = app.locator('input.slider');
    await expect(slider).toHaveAttribute('max', '2000');
    await expect(slider).toHaveAttribute('step', '100');
    await slider.fill('2000');
    await expect.poll(() => robot.sent.at(-1)).toBe('SPEED 2000');
    await slider.fill('0');
    await expect.poll(() => robot.sent.at(-1)).toBe('SPEED 0');
  });

  test('a burst of changes is throttled but the last value always arrives', async ({
    app,
    robot,
  }) => {
    const slider = app.locator('input.slider');
    for (const v of [100, 200, 300, 400, 500, 600, 700, 800]) {
      await slider.fill(String(v));
    }
    await expect.poll(() => robot.sent.at(-1)).toBe('SPEED 800');
    expect(robot.sent.length).toBeLessThan(8);
  });

  test('is initialised from the robot STATE', async ({ page, robot }) => {
    robot.greeting = [stateFrame({ speed: 1500 })];
    await page.goto('/');
    await expect(page.locator('input.slider')).toHaveValue('1500');
  });
});

test.describe('PID form', () => {
  test('shows the default gains', async ({ app }) => {
    await expect(app.locator('#P')).toHaveValue('0.15');
    await expect(app.locator('#I')).toHaveValue('0.05');
    await expect(app.locator('#D')).toHaveValue('0');
  });

  test('is initialised from the robot STATE', async ({ page, robot }) => {
    robot.greeting = [stateFrame({ p: 0.4, i: 0.02, d: 0.003 })];
    await page.goto('/');
    await expect(page.locator('#P')).toHaveValue('0.4');
    await expect(page.locator('#I')).toHaveValue('0.02');
    await expect(page.locator('#D')).toHaveValue('0.003');
  });

  test('Set PID sends the three gains', async ({ app, robot }) => {
    await app.locator('#P').fill('0.5');
    await app.locator('#I').fill('0.1');
    await app.locator('#D').fill('0.002');
    await app.getByRole('button', { name: 'Set PID' }).click();
    await robot.expectSent('PID 0.5 0.1 0.002');
  });

  test('sends the defaults untouched', async ({ app, robot }) => {
    await app.getByRole('button', { name: 'Set PID' }).click();
    await robot.expectSent('PID 0.15 0.05 0');
  });

  for (const [name, field, value] of [
    ['empty', '#P', ''],
    ['negative', '#I', '-1'],
    ['negative D', '#D', '-0.001'],
  ]) {
    test(`Set PID is disabled for ${name} input`, async ({ app, robot }) => {
      await app.locator(field).fill(value);
      await expect(app.getByRole('button', { name: 'Set PID' })).toBeDisabled();
      expect(robot.sent).toEqual([]);
    });
  }

  test('Set PID is enabled again once the input is fixed', async ({ app }) => {
    await app.locator('#P').fill('');
    await expect(app.getByRole('button', { name: 'Set PID' })).toBeDisabled();
    await app.locator('#P').fill('0.2');
    await expect(app.getByRole('button', { name: 'Set PID' })).toBeEnabled();
  });
});
