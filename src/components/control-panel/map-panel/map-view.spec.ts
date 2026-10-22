import { DEFAULT_SCALE, MapView, MAX_SCALE, MIN_SCALE } from './map-view';

describe('MapView', () => {
  const view = () => new MapView(600, 600);

  it('puts the world origin in the middle of the canvas', () => {
    expect(view().toScreen({ x: 0, y: 0 })).toEqual({ px: 300, py: 300 });
  });

  it('draws forward (+x) up and left (+y) to the left', () => {
    const { px, py } = view().toScreen({ x: 100, y: 100 });
    expect(py).toBeCloseTo(300 - 100 * DEFAULT_SCALE);
    expect(px).toBeCloseTo(300 - 100 * DEFAULT_SCALE);
  });

  it('converts back with toWorld', () => {
    const v = view();
    v.centre = { x: 250, y: -80 };
    v.scale = 0.7;
    const world = v.toWorld(v.toScreen({ x: 123, y: 456 }));
    expect(world.x).toBeCloseTo(123);
    expect(world.y).toBeCloseTo(456);
  });

  it('keeps the world point under the pointer while panning', () => {
    const v = view();
    const before = v.toWorld({ px: 100, py: 100 });
    v.pan(40, -25);
    const after = v.toWorld({ px: 140, py: 75 });
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('keeps the world point under the pointer while zooming', () => {
    const v = view();
    const at = { px: 450, py: 120 };
    const before = v.toWorld(at);
    v.zoom(2, at);
    const after = v.toWorld(at);
    expect(v.scale).toBeCloseTo(DEFAULT_SCALE * 2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps the zoom', () => {
    const v = view();
    v.zoom(1e6, { px: 0, py: 0 });
    expect(v.scale).toBe(MAX_SCALE);
    v.zoom(1e-9, { px: 0, py: 0 });
    expect(v.scale).toBe(MIN_SCALE);
  });

  it('resets to the origin and default zoom', () => {
    const v = view();
    v.pan(10, 10);
    v.zoom(2, { px: 1, py: 1 });
    v.reset();
    expect(v.centre).toEqual({ x: 0, y: 0 });
    expect(v.scale).toBe(DEFAULT_SCALE);
  });
});
