import { readFile } from 'node:fs/promises';
import { countColour, expand, expect, measureFrame, poseFrame, test } from './fixtures';

const SWEEP_POSE = 'SWEEP_POSE T0=1000 X0=0 Y0=0 TH0=0 T1=1390 X1=0 Y1=0 TH1=0';
const panel = (page: import('@playwright/test').Page) => page.locator('log-panel');

const ndjson = (...frames: string[]) =>
  [
    JSON.stringify({ gadgetLog: 1 }),
    ...frames.map((frame, i) => JSON.stringify({ t: i * 10, frame })),
  ].join('\n') + '\n';

const file = (name: string, content: string) => ({
  name,
  mimeType: 'text/plain',
  buffer: Buffer.from(content),
});

test.describe('raw log: recording', () => {
  test('starts empty with Download and Replay disabled', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await expect(p.getByRole('heading', { name: 'Raw log' })).toBeVisible();
    await expect(p.getByText('0 frames recorded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Download' })).toBeDisabled();
    await expect(p.getByRole('button', { name: 'Replay' })).toBeDisabled();
    await expect(p.getByText('0 frames loaded')).toBeVisible();
  });

  test('records POSE, SWEEP_POSE and MEASURE frames only while recording', async ({
    app,
    robot,
  }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    robot.send(poseFrame(1, 1)); // not recording yet
    await p.getByRole('button', { name: 'Record' }).click();
    await expect(p.getByText(/0 frames recorded \(recording\)/)).toBeVisible();
    robot.send(poseFrame(2, 2), SWEEP_POSE, measureFrame(250), 'ERR nope');
    await expect(p.getByText(/3 frames recorded \(recording\)/)).toBeVisible(); // ERR is not logged
    await p.getByRole('button', { name: 'Stop recording' }).click();
    await expect(p.getByText('3 frames recorded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Download' })).toBeEnabled();
  });

  test('Download is not possible while recording', async ({ app, robot }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p.getByRole('button', { name: 'Record' }).click();
    robot.send(poseFrame(2, 2));
    await expect(p.getByRole('button', { name: 'Download' })).toBeDisabled();
  });

  test('downloads the recording as NDJSON', async ({ app, robot }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p.getByRole('button', { name: 'Record' }).click();
    robot.send(poseFrame(2, 2), SWEEP_POSE, measureFrame(250));
    await expect(p.getByText(/3 frames recorded/)).toBeVisible();
    await p.getByRole('button', { name: 'Stop recording' }).click();

    const [download] = await Promise.all([
      app.waitForEvent('download'),
      p.getByRole('button', { name: 'Download' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^gadget-log-.*\.ndjson$/);
    const lines = (await readFile((await download.path())!, 'utf8'))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(lines[0]).toEqual({ gadgetLog: 1 });
    expect(lines.slice(1).map((l) => l.frame)).toEqual([
      poseFrame(2, 2),
      SWEEP_POSE,
      measureFrame(250),
    ]);
    expect(lines[1].t).toBe(0);
  });

  test('a new recording starts from scratch', async ({ app, robot }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p.getByRole('button', { name: 'Record' }).click();
    robot.send(poseFrame(2, 2));
    await expect(p.getByText(/1 frames recorded/)).toBeVisible();
    await p.getByRole('button', { name: 'Stop recording' }).click();
    await p.getByRole('button', { name: 'Record' }).click();
    await expect(p.getByText(/0 frames recorded \(recording\)/)).toBeVisible();
  });
});

test.describe('raw log: replay', () => {
  test('loads a file and reports the number of frames', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p
      .locator('input[type=file]')
      .setInputFiles(file('drive.ndjson', ndjson(poseFrame(1, 1), SWEEP_POSE, measureFrame(250))));
    await expect(p.getByText('3 frames loaded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Replay' })).toBeEnabled();
  });

  test('rejects a file that is not a Gadget log', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p.locator('input[type=file]').setInputFiles(file('bad.ndjson', 'hello\nworld\n'));
    await expect(p.locator('.log-panel__error')).toContainText('bad.ndjson: Not a Gadget log');
    await expect(p.getByText('0 frames loaded')).toBeVisible();
    await expect(p.getByRole('button', { name: 'Replay' })).toBeDisabled();
  });

  test('rejects a file with a broken line and keeps nothing', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p
      .locator('input[type=file]')
      .setInputFiles(file('broken.ndjson', ndjson(poseFrame(1, 1)) + 'not json\n'));
    await expect(p.locator('.log-panel__error')).toContainText('Line 3 is not valid JSON');
    await expect(p.getByText('0 frames loaded')).toBeVisible();
  });

  test('rejects an empty file', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p.locator('input[type=file]').setInputFiles(file('empty.ndjson', ''));
    await expect(p.locator('.log-panel__error')).toContainText('The file is empty');
  });

  test('an instant replay feeds the pose display and the map like live frames', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p
      .locator('input[type=file]')
      .setInputFiles(
        file(
          'drive.ndjson',
          ndjson(poseFrame(0, 0), poseFrame(300, 100, 1571), SWEEP_POSE, measureFrame(250)),
        ),
      );
    await p.getByLabel('Speed').selectOption({ label: 'Instant' });
    await p.getByRole('button', { name: 'Replay' }).click();
    await expect(app.locator('.pose-display__values')).toContainText('300 mm');
    await expect(app.locator('.pose-display__values')).toContainText('90.0°');
    await expect
      .poll(() => countColour(app.locator('map-panel canvas'), [0xff, 0xd5, 0x4f]))
      .toBeGreaterThan(0);
    await expect(p.getByRole('button', { name: 'Replay' })).toBeEnabled(); // finished
  });

  test('a replay is not recorded again', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    await p
      .locator('input[type=file]')
      .setInputFiles(file('drive.ndjson', ndjson(poseFrame(5, 5), poseFrame(6, 6))));
    await p.getByRole('button', { name: 'Record' }).click();
    await expect(p.getByRole('button', { name: 'Replay' })).toBeDisabled(); // not while recording
    await p.getByRole('button', { name: 'Stop recording' }).click();
    await p.getByLabel('Speed').selectOption({ label: 'Instant' });
    await p.getByRole('button', { name: 'Record' }).click();
    await p.getByRole('button', { name: 'Stop recording' }).click();
    await p.getByRole('button', { name: 'Replay' }).click();
    await expect(p.getByText('0 frames recorded')).toBeVisible();
  });

  test('a real-time replay can be stopped', async ({ app }) => {
    await expand(app, 'log-panel');
    const p = panel(app);
    const slow =
      ndjson(poseFrame(1, 1)) + JSON.stringify({ t: 20000, frame: poseFrame(999, 999) }) + '\n';
    await p.locator('input[type=file]').setInputFiles(file('slow.ndjson', slow));
    await p.getByRole('button', { name: 'Replay' }).click();
    await expect(p.getByRole('button', { name: 'Stop replay' })).toBeVisible();
    await expect(p.getByLabel('Speed')).toBeDisabled();
    await expect(app.locator('.pose-display__values')).toContainText('1 mm');
    await p.getByRole('button', { name: 'Stop replay' }).click();
    await expect(p.getByRole('button', { name: 'Replay' })).toBeVisible();
    await app.waitForTimeout(300);
    await expect(app.locator('.pose-display__values')).not.toContainText('999 mm');
  });

  test('offers 1x, 4x and Instant replay speeds', async ({ app }) => {
    await expand(app, 'log-panel');
    const options = await panel(app).getByLabel('Speed').locator('option').allTextContents();
    expect(options).toEqual(['1x', '4x', 'Instant']);
  });
});
