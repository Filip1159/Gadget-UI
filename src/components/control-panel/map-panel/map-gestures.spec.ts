import { MapGestures, WHEEL_ZOOM_STEP } from './map-gestures';
import { DEFAULT_SCALE, MapView } from './map-view';

describe('MapGestures', () => {
  let view: MapView;
  let gestures: MapGestures;

  beforeEach(() => {
    view = new MapView(600, 600);
    gestures = new MapGestures(view, 600);
  });

  it('pans the map by the pointer movement', () => {
    gestures.start(1, 100, 100);
    expect(gestures.move(1, 160, 130, 600)).toBe(true);
    // dragging right moves the world right under the pointer: centre.y grows, dragging down: centre.x grows
    expect(view.centre.y).toBeCloseTo(60 / DEFAULT_SCALE);
    expect(view.centre.x).toBeCloseTo(30 / DEFAULT_SCALE);
  });

  it('moves relative to the previous event, not to the start', () => {
    gestures.start(1, 0, 0);
    gestures.move(1, 10, 0, 600);
    gestures.move(1, 20, 0, 600);
    expect(view.centre.y).toBeCloseTo(20 / DEFAULT_SCALE);
  });

  it('converts CSS pixels to canvas pixels when the canvas is scaled down', () => {
    gestures.start(1, 0, 0);
    gestures.move(1, 50, 0, 300); // canvas shown at half size: 50 CSS px are 100 canvas px
    expect(view.centre.y).toBeCloseTo(100 / DEFAULT_SCALE);
  });

  it('ignores moves without a drag, from another pointer, and after the drag ended', () => {
    expect(gestures.move(1, 10, 10, 600)).toBe(false);
    gestures.start(1, 0, 0);
    expect(gestures.move(2, 10, 10, 600)).toBe(false);
    gestures.end(2); // another pointer lifting does not end our drag
    expect(gestures.dragging).toBe(true);
    gestures.end(1);
    expect(gestures.dragging).toBe(false);
    expect(gestures.move(1, 10, 10, 600)).toBe(false);
    expect(view.centre).toEqual({ x: 0, y: 0 });
  });

  it('zooms in on wheel up and out on wheel down, around the pointer', () => {
    const rect = { left: 0, top: 0, width: 600 };
    const under = view.toWorld({ px: 450, py: 150 });
    gestures.wheel(-100, 450, 150, rect);
    expect(view.scale).toBeCloseTo(DEFAULT_SCALE * WHEEL_ZOOM_STEP);
    expect(view.toWorld({ px: 450, py: 150 }).x).toBeCloseTo(under.x);
    expect(view.toWorld({ px: 450, py: 150 }).y).toBeCloseTo(under.y);
    gestures.wheel(100, 450, 150, rect);
    expect(view.scale).toBeCloseTo(DEFAULT_SCALE);
  });

  it('takes the canvas offset and CSS scaling into account when zooming', () => {
    const rect = { left: 100, top: 50, width: 300 }; // canvas drawn at half size, 100px from the left
    // pointer at CSS (300,150) = 200 / 100 CSS px into the canvas = canvas px (400,200)
    const at = view.toWorld({ px: 400, py: 200 });
    gestures.wheel(-1, 300, 150, rect);
    const after = view.toWorld({ px: 400, py: 200 });
    expect(after.x).toBeCloseTo(at.x);
    expect(after.y).toBeCloseTo(at.y);
  });
});
