import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pose } from '../../../core/protocol';
import { RedrawScheduler } from '../../../core/redraw-scheduler';
import { onSocketStatus } from '../../../core/socket/socket-status';
import { SocketService } from '../../../core/socket/socket.service';
import { PosedSweep } from '../../../core/socket/sweep-pairing';
import { MapGestures } from './map-gestures';
import { MapRenderer } from './map-renderer';
import { Trail } from './map-trail';
import { MapView } from './map-view';
import { PointCloud } from './point-cloud';
import { clipRange, isStationary, projectReadings, Reading } from './point-projection';

// Logical canvas size; CSS scales it down on narrow screens.
const CANVAS_SIZE_PX = 600;
/** "Stationary sweeps only": a sweep counts as still if the robot moved at most this far and turned at most this much. */
const STATIONARY_MAX_MM = 10;
const STATIONARY_MAX_RAD = (2 * Math.PI) / 180;
export const DEFAULT_MIN_RANGE_MM = 0;
export const DEFAULT_MAX_RANGE_MM = 1000;

/** Top-down map in the odometry frame: robot marker with heading, the path it drove, pan (drag) and zoom (wheel). */
@Component({
  selector: 'map-panel',
  templateUrl: './map-panel.html',
  styleUrl: './map-panel.scss',
})
export class MapPanel {
  private socket = inject(SocketService);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly view = new MapView(CANVAS_SIZE_PX, CANVAS_SIZE_PX);
  private readonly gestures = new MapGestures(this.view, CANVAS_SIZE_PX);
  readonly trail = new Trail();
  readonly cloud = new PointCloud();
  readonly pose = signal<Pose | null>(null);
  /** Beams of the latest accepted sweep. */
  private rays: readonly Reading[] = [];

  readonly showGrid = signal(true);
  readonly showTrail = signal(true);
  readonly showPoints = signal(true);
  readonly showRays = signal(false);
  /** Drop sweeps taken while the robot was moving: odometry error during motion smears the points. */
  readonly stationaryOnly = signal(false);
  /** Readings outside this range are ignored; they apply to sweeps that arrive after the change. */
  readonly minRangeMm = signal(DEFAULT_MIN_RANGE_MM);
  readonly maxRangeMm = signal(DEFAULT_MAX_RANGE_MM);
  private renderer?: MapRenderer;
  private readonly redraw = new RedrawScheduler(() =>
    this.renderer?.render(
      this.view,
      { trail: this.trail.path, pose: this.pose(), cloud: this.cloud.all, rays: this.rays },
      {
        grid: this.showGrid(),
        trail: this.showTrail(),
        points: this.showPoints(),
        rays: this.showRays(),
      },
    ),
  );

  constructor() {
    this.socket.pose$.pipe(takeUntilDestroyed()).subscribe((pose) => {
      this.pose.set(pose);
      this.trail.add({ x: pose.xMm, y: pose.yMm });
      this.redraw.schedule();
    });

    this.socket.posedSweeps$.pipe(takeUntilDestroyed()).subscribe((posed) => {
      this.addSweep(posed);
      this.redraw.schedule();
    });

    afterNextRender(() => {
      const canvas = this.canvas()?.nativeElement;
      if (canvas) {
        this.renderer = new MapRenderer(
          canvas,
          CANVAS_SIZE_PX,
          CANVAS_SIZE_PX,
          window.devicePixelRatio || 1,
        );
        this.redraw.schedule();
      }
    });

    effect(() => {
      this.showGrid();
      this.showTrail();
      this.showPoints();
      this.showRays();
      this.redraw.schedule();
    });

    // The odometry frame means nothing across connections, so start afresh.
    onSocketStatus(this.socket, ['closed'], () => {
      this.pose.set(null);
      this.trail.clear();
      this.cloud.clear();
      this.rays = [];
      this.redraw.schedule();
    });
  }

  recentre(): void {
    this.view.reset();
    this.redraw.schedule();
  }

  private addSweep(posed: PosedSweep): void {
    if (
      !posed.pose ||
      (this.stationaryOnly() && !isStationary(posed.pose, STATIONARY_MAX_MM, STATIONARY_MAX_RAD))
    ) {
      return;
    }
    const readings = clipRange(projectReadings(posed), this.minRangeMm(), this.maxRangeMm());
    this.rays = readings;
    this.cloud.add(
      readings.map((r) => r.to),
      Date.now(),
    );
  }

  /** Sets a range limit from a number input; ignores text that is not a non-negative number. */
  setRange(limit: 'min' | 'max', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    (limit === 'min' ? this.minRangeMm : this.maxRangeMm).set(value);
  }

  /** Forgets the path, the obstacle points and the rays. */
  clearTrail(): void {
    this.trail.clear();
    this.cloud.clear();
    this.rays = [];
    this.redraw.schedule();
  }

  onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.gestures.start(event.pointerId, event.clientX, event.clientY);
  }

  onPointerMove(event: PointerEvent): void {
    const width = (event.currentTarget as HTMLElement).getBoundingClientRect().width;
    if (this.gestures.move(event.pointerId, event.clientX, event.clientY, width)) {
      this.redraw.schedule();
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.gestures.end(event.pointerId);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.gestures.wheel(
      event.deltaY,
      event.clientX,
      event.clientY,
      (event.currentTarget as HTMLElement).getBoundingClientRect(),
    );
    this.redraw.schedule();
  }
}
