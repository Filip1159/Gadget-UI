import { Trail, TRAIL_JUMP_MM, TRAIL_MAX_POINTS, TRAIL_MIN_STEP_MM } from './map-trail';

describe('Trail', () => {
  it('records points and skips ones that barely moved', () => {
    const trail = new Trail();
    trail.add({ x: 0, y: 0 });
    trail.add({ x: TRAIL_MIN_STEP_MM - 1, y: 0 });
    trail.add({ x: TRAIL_MIN_STEP_MM, y: 0 });
    expect(trail.path).toEqual([
      { x: 0, y: 0 },
      { x: TRAIL_MIN_STEP_MM, y: 0 },
    ]);
  });

  it('starts afresh when the pose jumps, as after POSE_RESET', () => {
    const trail = new Trail();
    trail.add({ x: 0, y: 0 });
    trail.add({ x: 100, y: 0 });
    trail.add({ x: 100 + TRAIL_JUMP_MM + 1, y: 0 });
    trail.add({ x: 0, y: 0 });
    expect(trail.path).toEqual([{ x: 0, y: 0 }]);
  });

  it('is bounded: the oldest points go first', () => {
    const trail = new Trail();
    for (let i = 0; i < TRAIL_MAX_POINTS + 10; i++) {
      trail.add({ x: i * 10, y: 0 });
    }
    expect(trail.path.length).toBe(TRAIL_MAX_POINTS);
    expect(trail.path[0].x).toBe(100);
  });

  it('clears', () => {
    const trail = new Trail();
    trail.add({ x: 0, y: 0 });
    trail.clear();
    expect(trail.path).toEqual([]);
  });
});
