/** A point on the map, in millimetres, in the robot's odometry frame (REP-103: +x forward, +y left). */
export type WorldPoint = { x: number; y: number }
export type ScreenPoint = { px: number; py: number }

export const MIN_SCALE = 0.02 // px per mm
export const MAX_SCALE = 5
export const DEFAULT_SCALE = 0.3

/**
 * Maps the odometry frame to canvas pixels. World +x (forward) points up the screen and world +y (left)
 * points left, like the robot preview, so a robot driving forward moves up. `centre` is the world point in the
 * middle of the canvas.
 */
export class MapView {
  centre: WorldPoint = { x: 0, y: 0 }
  scale = DEFAULT_SCALE

  constructor(private readonly widthPx: number, private readonly heightPx: number) {}

  toScreen(p: WorldPoint): ScreenPoint {
    return {
      px: this.widthPx / 2 - (p.y - this.centre.y) * this.scale,
      py: this.heightPx / 2 - (p.x - this.centre.x) * this.scale,
    }
  }

  toWorld(s: ScreenPoint): WorldPoint {
    return {
      x: this.centre.x - (s.py - this.heightPx / 2) / this.scale,
      y: this.centre.y - (s.px - this.widthPx / 2) / this.scale,
    }
  }

  /** Moves the map with the pointer: the world point under the pointer stays under it. */
  pan(dxPx: number, dyPx: number): void {
    this.centre = { x: this.centre.x + dyPx / this.scale, y: this.centre.y + dxPx / this.scale }
  }

  /** Zooms by `factor`, keeping the world point under `at` fixed. Clamped to MIN_SCALE..MAX_SCALE. */
  zoom(factor: number, at: ScreenPoint): void {
    const anchor = this.toWorld(at)
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor))
    const moved = this.toWorld(at)
    this.centre = { x: this.centre.x + anchor.x - moved.x, y: this.centre.y + anchor.y - moved.y }
  }

  reset(): void {
    this.centre = { x: 0, y: 0 }
    this.scale = DEFAULT_SCALE
  }
}
