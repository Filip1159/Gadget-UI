import { Pose } from '../../../protocol'
import { CHASSIS_POLYGON } from '../robot-preview/robot-geometry'
import { MapView, WorldPoint } from './map-view'

const BACKGROUND = '#2b2b2b'
const TRAIL_COLOR = '#4fc3f7'
const ROBOT_COLOR = 'white'
const HEADING_COLOR = '#f44336'
const TRAIL_WIDTH = 2
const HEADING_WIDTH = 3
/** The heading line reaches this far past the front edge of the robot (mm). */
const HEADING_LENGTH_MM = 120

/** Draws the map (trail and robot marker) on a HiDPI canvas of `widthPx` x `heightPx` logical pixels. */
export class MapRenderer {
  private readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, private readonly widthPx: number, private readonly heightPx: number, dpr = 1) {
    canvas.width = widthPx * dpr
    canvas.height = heightPx * dpr
    this.ctx = canvas.getContext('2d')!
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(view: MapView, trail: readonly WorldPoint[], pose: Pose | null): void {
    this.ctx.fillStyle = BACKGROUND
    this.ctx.fillRect(0, 0, this.widthPx, this.heightPx)
    this.drawTrail(view, trail)
    if (pose) {
      this.drawRobot(view, pose)
    }
  }

  private drawTrail(view: MapView, trail: readonly WorldPoint[]): void {
    if (trail.length < 2) {
      return
    }
    const ctx = this.ctx
    ctx.beginPath()
    trail.forEach((p, i) => {
      const { px, py } = view.toScreen(p)
      return i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.strokeStyle = TRAIL_COLOR
    ctx.lineWidth = TRAIL_WIDTH
    ctx.stroke()
  }

  private drawRobot(view: MapView, pose: Pose): void {
    const ctx = this.ctx
    const cos = Math.cos(pose.theta)
    const sin = Math.sin(pose.theta)
    // Robot-local (forward, left) in mm to screen.
    const toScreen = (forward: number, left: number) =>
      view.toScreen({
        x: pose.xMm + forward * cos - left * sin,
        y: pose.yMm + forward * sin + left * cos,
      })

    ctx.beginPath()
    CHASSIS_POLYGON.forEach((p, i) => {
      // The preview geometry has x to the right and the front at -y.
      const { px, py } = toScreen(-p.y, -p.x)
      return i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = ROBOT_COLOR
    ctx.fill()

    const centre = toScreen(0, 0)
    const nose = toScreen(HEADING_LENGTH_MM, 0)
    ctx.beginPath()
    ctx.moveTo(centre.px, centre.py)
    ctx.lineTo(nose.px, nose.py)
    ctx.strokeStyle = HEADING_COLOR
    ctx.lineWidth = HEADING_WIDTH
    ctx.stroke()
  }
}
