import { RobotMessage, Sweep, SweepPose } from './protocol';
import { SweepPairer } from './sweep-pairing';

const sweep: Sweep = new Map([['FRONT', 400]]);
const poseA: SweepPose = {
  start: { xMm: 0, yMm: 0, theta: 0, tMs: 1000 },
  end: { xMm: 20, yMm: 0, theta: 0, tMs: 1390 },
};
const poseB: SweepPose = {
  start: { xMm: 20, yMm: 0, theta: 0, tMs: 1400 },
  end: { xMm: 45, yMm: 1, theta: 0.01, tMs: 1790 },
};
const measure = (s: Sweep = sweep): RobotMessage => ({ type: 'measure', sweep: s });
const sweepPose = (p: SweepPose): RobotMessage => ({ type: 'sweepPose', sweepPose: p });
const otherFrame: RobotMessage = { type: 'error', reason: 'x' };

describe('SweepPairer', () => {
  it('joins a MEASURE frame with the SWEEP_POSE right before it', () => {
    const pairer = new SweepPairer();
    expect(pairer.push(sweepPose(poseA))).toBeUndefined();
    expect(pairer.push(measure())).toEqual({ sweep, pose: poseA });
  });

  it('ignores other frames in between', () => {
    const pairer = new SweepPairer();
    pairer.push(sweepPose(poseA));
    pairer.push(otherFrame);
    expect(pairer.push(measure())?.pose).toBe(poseA);
  });

  it('uses a pose only once: a MEASURE without its own SWEEP_POSE gets none', () => {
    const pairer = new SweepPairer();
    pairer.push(sweepPose(poseA));
    pairer.push(measure());
    expect(pairer.push(measure())).toEqual({ sweep, pose: null });
  });

  it('lets a newer pose replace an unused older one', () => {
    const pairer = new SweepPairer();
    pairer.push(sweepPose(poseA));
    pairer.push(sweepPose(poseB));
    expect(pairer.push(measure())?.pose).toBe(poseB);
  });

  it('passes sweeps through with no pose for firmware that does not send SWEEP_POSE', () => {
    expect(new SweepPairer().push(measure())).toEqual({ sweep, pose: null });
  });

  it('forgets an unused pose on reset', () => {
    const pairer = new SweepPairer();
    pairer.push(sweepPose(poseA));
    pairer.reset();
    expect(pairer.push(measure())?.pose).toBeNull();
  });
});
