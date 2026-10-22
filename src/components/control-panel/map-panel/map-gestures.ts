import { MapView } from './map-view';

export const WHEEL_ZOOM_STEP = 1.15;

/** The part of an element's bounding rect the gestures need. */
export type CanvasRect = { left: number; top: number; width: number };

/**
 * Pan (drag) and zoom (wheel) on a MapView, framework-free so it can be unit tested. Pointer coordinates are CSS
 * pixels; the canvas has `canvasPx` logical pixels and may be scaled down by CSS on narrow screens, so deltas are
 * converted to logical pixels by the ratio of the two.
 */
export class MapGestures {
  private drag: { pointerId: number; x: number; y: number } | null = null;

  constructor(
    private readonly view: MapView,
    private readonly canvasPx: number,
  ) {}

  get dragging(): boolean {
    return this.drag !== null;
  }

  start(pointerId: number, clientX: number, clientY: number): void {
    this.drag = { pointerId, x: clientX, y: clientY };
  }

  /** Pans by the movement since the last event. Returns whether the view changed (so the caller redraws). */
  move(pointerId: number, clientX: number, clientY: number, cssWidth: number): boolean {
    if (!this.drag || this.drag.pointerId !== pointerId) {
      return false;
    }
    const ratio = this.pixelRatio(cssWidth);
    this.view.pan((clientX - this.drag.x) * ratio, (clientY - this.drag.y) * ratio);
    this.drag.x = clientX;
    this.drag.y = clientY;
    return true;
  }

  end(pointerId: number): void {
    if (this.drag?.pointerId === pointerId) {
      this.drag = null;
    }
  }

  /** Wheel up zooms in, wheel down zooms out, around the pointer. */
  wheel(deltaY: number, clientX: number, clientY: number, rect: CanvasRect): void {
    const ratio = this.pixelRatio(rect.width);
    const factor = deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
    this.view.zoom(factor, { px: (clientX - rect.left) * ratio, py: (clientY - rect.top) * ratio });
  }

  /** Logical canvas pixels per CSS pixel. */
  private pixelRatio(cssWidth: number): number {
    return cssWidth > 0 ? this.canvasPx / cssWidth : 1;
  }
}
