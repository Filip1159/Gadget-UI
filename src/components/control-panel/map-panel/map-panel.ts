import { afterNextRender, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Pose } from '../../../protocol'
import { SocketService } from '../../../socket.service'
import { PosedSweep } from '../../../sweep-pairing'
import { MapRenderer } from './map-renderer'
import { Trail } from './map-trail'
import { MapView } from './map-view'
import { PointCloud } from './point-cloud'
import { clipRange, isStationary, projectReadings, Reading } from './point-projection'

// Logical canvas size; CSS scales it down on narrow screens.
const CANVAS_SIZE_PX = 600
const WHEEL_ZOOM_STEP = 1.15
/** "Stationary sweeps only": a sweep counts as still if the robot moved at most this far and turned at most this much. */
const STATIONARY_MAX_MM = 10
const STATIONARY_MAX_RAD = (2 * Math.PI) / 180
export const DEFAULT_MIN_RANGE_MM = 0
export const DEFAULT_MAX_RANGE_MM = 1000

/** Top-down map in the odometry frame: robot marker with heading, the path it drove, pan (drag) and zoom (wheel). */
@Component({
  selector: 'map-panel',
  templateUrl: './map-panel.html',
  styleUrl: './map-panel.scss',
})
export class MapPanel {
  private socket = inject(SocketService)
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas')

  readonly view = new MapView(CANVAS_SIZE_PX, CANVAS_SIZE_PX)
  readonly trail = new Trail()
  readonly cloud = new PointCloud()
  readonly pose = signal<Pose | null>(null)
  /** Beams of the latest accepted sweep. */
  private rays: readonly Reading[] = []

  readonly showGrid = signal(true)
  readonly showTrail = signal(true)
  readonly showPoints = signal(true)
  readonly showRays = signal(false)
  /** Drop sweeps taken while the robot was moving: odometry error during motion smears the points. */
  readonly stationaryOnly = signal(false)
  /** Readings outside this range are ignored; they apply to sweeps that arrive after the change. */
  readonly minRangeMm = signal(DEFAULT_MIN_RANGE_MM)
  readonly maxRangeMm = signal(DEFAULT_MAX_RANGE_MM)
  private renderer?: MapRenderer
  private redrawScheduled = false
  private drag: { pointerId: number; x: number; y: number } | null = null

  constructor() {
    this.socket.pose$.pipe(takeUntilDestroyed()).subscribe(pose => {
      this.pose.set(pose)
      this.trail.add({ x: pose.xMm, y: pose.yMm })
      this.scheduleRedraw()
    })

    this.socket.posedSweeps$.pipe(takeUntilDestroyed()).subscribe(posed => {
      this.addSweep(posed)
      this.scheduleRedraw()
    })

    afterNextRender(() => {
      const canvas = this.canvas()?.nativeElement
      if (canvas) {
        this.renderer = new MapRenderer(canvas, CANVAS_SIZE_PX, CANVAS_SIZE_PX, window.devicePixelRatio || 1)
        this.scheduleRedraw()
      }
    })

    effect(() => {
      this.showGrid()
      this.showTrail()
      this.showPoints()
      this.showRays()
      this.scheduleRedraw()
    })

    // The odometry frame means nothing across connections, so start afresh.
    effect(() => {
      if (this.socket.status() === 'closed') {
        this.pose.set(null)
        this.trail.clear()
        this.cloud.clear()
        this.rays = []
        this.scheduleRedraw()
      }
    })
  }

  recentre(): void {
    this.view.reset()
    this.scheduleRedraw()
  }

  private addSweep(posed: PosedSweep): void {
    if (!posed.pose || (this.stationaryOnly() && !isStationary(posed.pose, STATIONARY_MAX_MM, STATIONARY_MAX_RAD))) {
      return
    }
    const readings = clipRange(projectReadings(posed), this.minRangeMm(), this.maxRangeMm())
    this.rays = readings
    this.cloud.add(readings.map(r => r.to), Date.now())
  }

  /** Sets a range limit from a number input; ignores text that is not a non-negative number. */
  setRange(limit: 'min' | 'max', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value)
    if (!Number.isFinite(value) || value < 0) {
      return
    }
    (limit === 'min' ? this.minRangeMm : this.maxRangeMm).set(value)
  }

  /** Forgets the path, the obstacle points and the rays. */
  clearTrail(): void {
    this.trail.clear()
    this.cloud.clear()
    this.rays = []
    this.scheduleRedraw()
  }

  onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    this.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      return
    }
    const ratio = this.pixelRatio(event.currentTarget as HTMLElement)
    this.view.pan((event.clientX - this.drag.x) * ratio, (event.clientY - this.drag.y) * ratio)
    this.drag.x = event.clientX
    this.drag.y = event.clientY
    this.scheduleRedraw()
  }

  onPointerUp(event: PointerEvent): void {
    if (this.drag?.pointerId === event.pointerId) {
      this.drag = null
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault()
    const element = event.currentTarget as HTMLElement
    const rect = element.getBoundingClientRect()
    const ratio = this.pixelRatio(element)
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP
    this.view.zoom(factor, { px: (event.clientX - rect.left) * ratio, py: (event.clientY - rect.top) * ratio })
    this.scheduleRedraw()
  }

  /** Logical canvas pixels per CSS pixel (the canvas is scaled down on narrow screens). */
  private pixelRatio(element: HTMLElement): number {
    const width = element.getBoundingClientRect().width
    return width > 0 ? CANVAS_SIZE_PX / width : 1
  }

  /** Coalesces bursts of events into a single repaint per frame. */
  private scheduleRedraw(): void {
    if (this.redrawScheduled) {
      return
    }
    this.redrawScheduled = true
    requestAnimationFrame(() => {
      this.redrawScheduled = false
      this.renderer?.render(
        this.view,
        { trail: this.trail.path, pose: this.pose(), cloud: this.cloud.all, rays: this.rays },
        { grid: this.showGrid(), trail: this.showTrail(), points: this.showPoints(), rays: this.showRays() },
      )
    })
  }
}
