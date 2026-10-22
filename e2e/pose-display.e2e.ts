import { expand, expect, poseFrame, test } from './fixtures';

const SWEEP_POSE = (dx: number, dy: number, dthMrad = 0) =>
  `SWEEP_POSE T0=1000 X0=0 Y0=0 TH0=0 T1=1400 X1=${dx} Y1=${dy} TH1=${dthMrad}`;

test.describe('pose display', () => {
  test('shows "No pose yet" before the first POSE frame', async ({ app }) => {
    await expand(app, 'pose-display');
    await expect(app.getByRole('heading', { name: 'Pose' })).toBeVisible();
    await expect(app.getByText('No pose yet')).toBeVisible();
  });

  test('shows x, y and heading in degrees', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send(poseFrame(120, -40, 1571));
    const values = app.locator('.pose-display__values');
    await expect(values).toContainText('120 mm');
    await expect(values).toContainText('-40 mm');
    await expect(values).toContainText('90.0°');
  });

  test('updates with every POSE frame', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send(poseFrame(10, 20));
    await expect(app.locator('.pose-display__values')).toContainText('10 mm');
    robot.send(poseFrame(300, 400, -1571));
    await expect(app.locator('.pose-display__values')).toContainText('300 mm');
    await expect(app.locator('.pose-display__values')).toContainText('-90.0°');
  });

  test('warns about suspected wheel slip', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send('POSE X=1 Y=2 TH=0 T=5 Q=1');
    await expect(app.getByText('Wheel slip suspected')).toBeVisible();
    robot.send(poseFrame(1, 2));
    await expect(app.getByText('Wheel slip suspected')).toBeHidden();
  });

  test('warns that a pose restored after reboot is only a guess', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send(poseFrame(1, 2, 0, ' RELOC=1'));
    await expect(app.getByText('Restored after reboot: only a guess')).toBeVisible();
  });

  test('shows how far the robot moved during the last sweep', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.send(SWEEP_POSE(30, 40, 175));
    await expect(app.getByText(/Last sweep: moved 50 mm, turned 10\.0° in 400 ms/)).toBeVisible();
  });

  test('Reset pose sends POSE_RESET', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    await app.getByRole('button', { name: 'Reset pose' }).click();
    await robot.expectSent('POSE_RESET');
  });

  test('Reset pose is disabled while disconnected', async ({ offlineApp }) => {
    await expand(offlineApp, 'pose-display');
    await expect(offlineApp.getByRole('button', { name: 'Reset pose' })).toBeDisabled();
  });

  test('the pose is forgotten when the connection drops', async ({ app, robot }) => {
    await expand(app, 'pose-display');
    robot.greeting = [];
    robot.send(poseFrame(120, 40), SWEEP_POSE(5, 5));
    await expect(app.locator('.pose-display__values')).toBeVisible();
    robot.drop();
    await expect(app.getByText('No pose yet')).toBeVisible();
    await expect(app.getByText(/Last sweep/)).toBeHidden();
  });
});
