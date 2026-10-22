import { describe, expect, it } from 'vitest';
import { SENSOR_DIRECTIONS } from '../../../core/protocol';
import { CHASSIS_POLYGON, ROBOT, SENSOR_MOUNTS, WHEELS } from './robot-geometry';

describe('robot geometry (mm)', () => {
  it('chassis is 135 x 180 with 18mm chamfer edges at 45 degrees', () => {
    const xs = CHASSIS_POLYGON.map((p) => p.x);
    const ys = CHASSIS_POLYGON.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(135);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(180);

    // Edge from the end of the top side to the start of the right side is the front-right chamfer.
    const [a, b] = [CHASSIS_POLYGON[1], CHASSIS_POLYGON[2]];
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(ROBOT.chamferLength);
    expect(b.x - a.x).toBeCloseTo(b.y - a.y); // 45 degrees
  });

  it('wheels are 80 x 16, centred on each side', () => {
    expect(WHEELS).toHaveLength(2);
    for (const wheel of WHEELS) {
      expect(wheel.width).toBe(16);
      expect(wheel.height).toBe(80);
      expect(wheel.y + wheel.height / 2).toBeCloseTo(0);
    }
    expect(WHEELS[0].x).toBeCloseTo(-67.5);
    expect(WHEELS[1].x + WHEELS[1].width).toBeCloseTo(67.5);
  });

  it('front/back sensors are centred, side sensors 35mm from the ends', () => {
    expect(SENSOR_MOUNTS.FRONT).toMatchObject({ x: 0, y: -90 });
    expect(SENSOR_MOUNTS.BACK).toMatchObject({ x: 0, y: 90 });
    expect(SENSOR_MOUNTS.FRONT_LEFT).toMatchObject({ x: -67.5, y: -55 });
    expect(SENSOR_MOUNTS.BACK_RIGHT).toMatchObject({ x: 67.5, y: 55 });
  });

  it('45 degree sensors sit in the middle of a chamfer', () => {
    const [a, b] = [CHASSIS_POLYGON[1], CHASSIS_POLYGON[2]];
    expect(SENSOR_MOUNTS.FRONT_RIGHT_45.x).toBeCloseTo((a.x + b.x) / 2);
    expect(SENSOR_MOUNTS.FRONT_RIGHT_45.y).toBeCloseTo((a.y + b.y) / 2);
  });

  it('has a mount for every sensor on the wire', () => {
    for (const direction of SENSOR_DIRECTIONS) {
      expect(SENSOR_MOUNTS[direction]).toBeDefined();
    }
  });
});
