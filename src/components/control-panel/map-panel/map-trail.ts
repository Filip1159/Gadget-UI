import { WorldPoint } from './map-view'

/** Only points at least this far from the previous one are kept. */
export const TRAIL_MIN_STEP_MM = 5
/** The robot cannot cover this much between two POSE frames (200 ms), so a bigger jump is a POSE_RESET. */
export const TRAIL_JUMP_MM = 500
export const TRAIL_MAX_POINTS = 5000

/** The path the robot has driven: thinned out, bounded, and started afresh when the pose is reset. */
export class Trail {
  private points: WorldPoint[] = []

  get path(): readonly WorldPoint[] {
    return this.points
  }

  add(p: WorldPoint): void {
    const last = this.points[this.points.length - 1]
    if (last) {
      const distance = Math.hypot(p.x - last.x, p.y - last.y)
      if (distance > TRAIL_JUMP_MM) {
        this.points = []
      } else if (distance < TRAIL_MIN_STEP_MM) {
        return
      }
    }
    this.points.push({ x: p.x, y: p.y })
    if (this.points.length > TRAIL_MAX_POINTS) {
      this.points.shift()
    }
  }

  clear(): void {
    this.points = []
  }
}
