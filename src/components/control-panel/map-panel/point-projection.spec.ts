import { Sweep, SweepPose } from '../../../core/protocol';
import {
  clipRange,
  interpolatePose,
  isStationary,
  projectReadings,
  projectSweep,
} from './point-projection';

const still = (xMm: number, yMm: number, theta: number): SweepPose => ({
  start: { xMm, yMm, theta, tMs: 0 },
  end: { xMm, yMm, theta, tMs: 390 },
});
const only = (direction: string, mm: number): Sweep => new Map([[direction, mm]]) as Sweep;

describe('projectSweep', () => {
  it('puts the FRONT reading straight ahead of the robot at the origin', () => {
    const [p] = projectSweep({ sweep: only('FRONT', 400), pose: still(0, 0, 0) });
    expect(p.x).toBeCloseTo(90 + 400); // front edge is 90 mm from the centre
    expect(p.y).toBeCloseTo(0);
  });

  it('puts left-looking sensors on the +y side', () => {
    const [p] = projectSweep({ sweep: only('FRONT_LEFT', 200), pose: still(0, 0, 0) });
    expect(p.y).toBeCloseTo(67.5 + 200);
    expect(p.x).toBeCloseTo(90 - 35);
  });

  it('puts back and right sensors behind and to the right', () => {
    const [back] = projectSweep({ sweep: only('BACK', 100), pose: still(0, 0, 0) });
    expect(back.x).toBeCloseTo(-190);
    const [right] = projectSweep({ sweep: only('FRONT_RIGHT', 100), pose: still(0, 0, 0) });
    expect(right.y).toBeCloseTo(-167.5);
  });

  it('follows the robot position and heading', () => {
    // Robot at (1000, 500) turned 90 deg counter-clockwise: forward is now +y.
    const [p] = projectSweep({ sweep: only('FRONT', 400), pose: still(1000, 500, Math.PI / 2) });
    expect(p.x).toBeCloseTo(1000);
    expect(p.y).toBeCloseTo(500 + 490);
  });

  it('skips out-of-range readings and sweeps without a pose', () => {
    const oor: Sweep = new Map([['FRONT', null]]) as Sweep;
    expect(projectSweep({ sweep: oor, pose: still(0, 0, 0) })).toEqual([]);
    expect(projectSweep({ sweep: only('FRONT', 400), pose: null })).toEqual([]);
  });

  it('uses the pose of the moment each sensor was ranged while the robot moves', () => {
    const moving: SweepPose = {
      start: { xMm: 0, yMm: 0, theta: 0, tMs: 0 },
      end: { xMm: 100, yMm: 0, theta: 0, tMs: 390 },
    };
    // FRONT is sensor 0 of 10: taken at 5% of the sweep, so the robot is at x = 5.
    const [first] = projectSweep({ sweep: only('FRONT', 0), pose: moving });
    expect(first.x).toBeCloseTo(90 + 5);
    // BACK_RIGHT is sensor 9 of 10: taken at 95%.
    const [last] = projectSweep({ sweep: only('BACK_RIGHT', 0), pose: moving });
    expect(last.x).toBeCloseTo(95 - 55);
  });
});

describe('interpolatePose', () => {
  it('turns the short way across the +-pi seam', () => {
    const a = { xMm: 0, yMm: 0, theta: Math.PI - 0.1, tMs: 0 };
    const b = { xMm: 0, yMm: 0, theta: -Math.PI + 0.1, tMs: 1 };
    expect(Math.cos(interpolatePose(a, b, 0.5).theta)).toBeCloseTo(-1);
  });
});

describe('clipRange', () => {
  const reading = (mm: number) => ({ from: { x: 0, y: 0 }, to: { x: mm, y: 0 }, mm });

  it('keeps readings inside the range, ends included', () => {
    expect(clipRange([50, 100, 500, 800, 801].map(reading), 100, 800).map((r) => r.mm)).toEqual([
      100, 500, 800,
    ]);
  });
});

describe('isStationary', () => {
  const pose = (dx: number, dTheta: number): SweepPose => ({
    start: { xMm: 0, yMm: 0, theta: 0, tMs: 0 },
    end: { xMm: dx, yMm: 0, theta: dTheta, tMs: 390 },
  });

  it('accepts a sweep within both limits and rejects one that moved or turned too much', () => {
    expect(isStationary(pose(5, 0.01), 10, 0.05)).toBe(true);
    expect(isStationary(pose(20, 0), 10, 0.05)).toBe(false);
    expect(isStationary(pose(0, 0.2), 10, 0.05)).toBe(false);
  });
});

describe('projectReadings', () => {
  it('reports the sensor position as the start of the beam', () => {
    const [r] = projectReadings({ sweep: only('FRONT', 400), pose: still(0, 0, 0) });
    expect(r.from.x).toBeCloseTo(90);
    expect(r.to.x).toBeCloseTo(490);
    expect(r.mm).toBe(400);
  });
});
