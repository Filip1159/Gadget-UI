import { Pose } from '../../../protocol'
import { CHASSIS_POLYGON } from '../robot-preview/robot-geometry'
import { gridLines, gridStepMm, stepLabel } from './map-grid'
import { MapView, WorldPoint } from './map-view'
import { CloudPoint, freshness } from './point-cloud'
import { Reading } from './point-projection'

const BACKGROUND = '#2b2b2b'
const GRID_COLOR = '#3d3d3d'
const GRID_ORIGIN_COLOR = '#5a5a5a'
const LABEL_COLOR = '#aaa'
const TRAIL_COLOR = '#4fc3f7'
const ROBOT_COLOR = 'white'
const HEADING_COLOR = '#f44336'
const RAY_COLOR = 'rgba(255, 255, 255, 0.35)'
const TRAIL_WIDTH = 2
const POINT_COLOR = '#ffd54f'
const POINT_SIZE_PX = 3
/** The oldest points stay faintly visible instead of vanishing. */
const POINT_MIN_ALPHA = 0.15
const HEADING_WIDTH = 3
/** The heading line reaches this far past the front edge of the robot (mm). */
const HEADING_LENGTH_MM = 120

/** What to draw. */
export type MapScene = {
  trail: readonly WorldPoint[]
  pose: Pose | null
  cloud: readonly CloudPoint[]
  /** Beams of the latest sweep. */
  rays: readonly Reading[]
}

export type MapLayers = { grid: boolean; trail: boolean; points: boolean; rays: boolean }

/** Draws the map on a HiDPI canvas of `widthPx` x `heightPx` logical pixels. */
export class MapRenderer {
  private readonly ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement, private readonly widthPx: number, private readonly heightPx: number, dpr = 1) {
    canvas.width = widthPx * dpr
    canvas.height = heightPx * dpr
    this.ctx = canvas.getContext('2d')!
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  render(view: MapView, scene: MapScene, layers: MapLayers, now = Date.now()): void {
    this.ctx.fillStyle = BACKGROUND
    this.ctx.fillRect(0, 0, this.widthPx, this.heightPx)
    if (layers.grid) {
      this.drawGrid(view)
    }
    if (layers.points) {
      this.drawPoints(view, scene.cloud, now)
    }
    if (layers.trail) {
      this.drawTrail(view, scene.trail)
    }
    if (layers.rays) {
      this.drawRays(view, scene.rays)
    }
    if (scene.pose) {
      this.drawRobot(view, scene.pose)
    }
  }

  /** Grid lines every 10 cm / 1 m / 10 m depending on zoom, with the spacing written in the corner. */
  private drawGrid(view: MapView): void {
    const ctx = this.ctx
    const step = gridStepMm(view.scale)
    const lines = gridLines(view, this.widthPx, this.heightPx, step)
    ctx.lineWidth = 1
    const stroke = (from: WorldPoint, to: WorldPoint, origin: boolean) => {
      const a = view.toScreen(from)
      const b = view.toScreen(to)
      ctx.strokeStyle = origin ? GRID_ORIGIN_COLOR : GRID_COLOR
      ctx.beginPath()
      ctx.moveTo(a.px, a.py)
      ctx.lineTo(b.px, b.py)
      ctx.stroke()
    }
    const a = view.toWorld({ px: 0, py: 0 })
    const b = view.toWorld({ px: this.widthPx, py: this.heightPx })
    for (const x of lines.x) {
      stroke({ x, y: a.y }, { x, y: b.y }, x === 0)
    }
    for (const y of lines.y) {
      stroke({ x: a.x, y }, { x: b.x, y }, y === 0)
    }
    ctx.fillStyle = LABEL_COLOR
    ctx.font = '12px sans-serif'
    ctx.fillText(`grid: ${stepLabel(step)}`, 8, this.heightPx - 8)
  }

  /** Obstacle points, brightest when new and fading with age. */
  private drawPoints(view: MapView, cloud: readonly CloudPoint[], now: number): void {
    const ctx = this.ctx
    ctx.fillStyle = POINT_COLOR
    for (const p of cloud) {
      const { px, py } = view.toScreen(p)
      ctx.globalAlpha = POINT_MIN_ALPHA + (1 - POINT_MIN_ALPHA) * freshness(p.addedAt, now)
      ctx.fillRect(px - POINT_SIZE_PX / 2, py - POINT_SIZE_PX / 2, POINT_SIZE_PX, POINT_SIZE_PX)
    }
    ctx.globalAlpha = 1
  }

  private drawRays(view: MapView, rays: readonly Reading[]): void {
    const ctx = this.ctx
    ctx.strokeStyle = RAY_COLOR
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const { from, to } of rays) {
      const a = view.toScreen(from)
      const b = view.toScreen(to)
      ctx.moveTo(a.px, a.py)
      ctx.lineTo(b.px, b.py)
    }
    ctx.stroke()
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
