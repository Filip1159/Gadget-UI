import { afterNextRender, Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Pose } from '../../../protocol'
import { SocketService } from '../../../socket.service'
import { MapRenderer } from './map-renderer'
import { Trail } from './map-trail'
import { MapView } from './map-view'

// Logical canvas size; CSS scales it down on narrow screens.
const CANVAS_SIZE_PX = 600
const WHEEL_ZOOM_STEP = 1.15

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
  readonly pose = signal<Pose | null>(null)
  private renderer?: MapRenderer
  private redrawScheduled = false
  private drag: { pointerId: number; x: number; y: number } | null = null

  constructor() {
    this.socket.pose$.pipe(takeUntilDestroyed()).subscribe(pose => {
      this.pose.set(pose)
      this.trail.add({ x: pose.xMm, y: pose.yMm })
      this.scheduleRedraw()
    })

    afterNextRender(() => {
      const canvas = this.canvas()?.nativeElement
      if (canvas) {
        this.renderer = new MapRenderer(canvas, CANVAS_SIZE_PX, CANVAS_SIZE_PX, window.devicePixelRatio || 1)
        this.scheduleRedraw()
      }
    })

    // The odometry frame means nothing across connections, so start afresh.
    effect(() => {
      if (this.socket.status() === 'closed') {
        this.pose.set(null)
        this.trail.clear()
        this.scheduleRedraw()
      }
    })
  }

  recentre(): void {
    this.view.reset()
    this.scheduleRedraw()
  }

  clearTrail(): void {
    this.trail.clear()
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
      this.renderer?.render(this.view, this.trail.path, this.pose())
    })
  }
}
