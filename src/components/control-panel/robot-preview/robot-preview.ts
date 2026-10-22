import { afterNextRender, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { RANGE_BANDS, SensorRenderer } from './sensor-renderer';
import { Command, Sweep } from '../../../core/protocol';
import { RedrawScheduler } from '../../../core/redraw-scheduler';
import { onSocketStatus } from '../../../core/socket/socket-status';
import { SocketService } from '../../../core/socket/socket.service';

const STALE_AFTER_MS = 3000;
// Logical canvas size; CSS scales it down on narrow screens.
const CANVAS_SIZE_PX = 600;

@Component({
  selector: 'robot-preview',
  templateUrl: './robot-preview.html',
  styleUrls: ['./robot-preview.scss'],
})
export class RobotPreview {
  private socket = inject(SocketService);
  public isMeasuring = signal(false);
  /** Legend of the colour bands the renderer uses. */
  readonly bands = RANGE_BANDS.map((band, i) => ({
    color: band.stroke,
    label:
      i === 0
        ? `< ${band.below} mm`
        : band.below === Infinity
          ? `> ${RANGE_BANDS[i - 1].below} mm`
          : `< ${band.below} mm`,
  }));
  // null = out of range (no obstacle detected)
  private distances: Sweep = new Map();
  private lastSweepAt = 0;
  private readonly redraw = new RedrawScheduler(() => this.renderer?.render(this.distances));
  private renderer?: SensorRenderer;

  constructor() {
    this.socket.sweeps$.pipe(takeUntilDestroyed()).subscribe((sweep) => {
      // A frame is one atomic sweep: replace the whole picture.
      this.distances = sweep;
      this.lastSweepAt = Date.now();
      this.redraw.schedule();
    });

    // A calibration run (CAL) shows its sweeps live; the firmware stops continuous measurement for it.
    this.socket.calibration$.pipe(takeUntilDestroyed()).subscribe((message) => {
      if (message.type === 'calibration') {
        this.isMeasuring.set(false);
        this.distances = message.sweep;
        this.lastSweepAt = Date.now();
        this.redraw.schedule();
      }
    });

    // The robot reports its own state on connect, so the button always matches reality.
    this.socket.state$
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.isMeasuring.set(state.measuring));

    // Drop readings that stopped arriving instead of showing them as current.
    interval(500)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.distances.size > 0 && Date.now() - this.lastSweepAt > STALE_AFTER_MS) {
          this.clearDistances();
        }
      });

    afterNextRender(() => {
      const canvas = this.canvas()?.nativeElement;
      if (canvas) {
        this.renderer = new SensorRenderer(canvas, CANVAS_SIZE_PX, window.devicePixelRatio || 1);
        this.renderer.render(this.distances);
      }
    });

    onSocketStatus(this.socket, ['closed'], () => {
      this.isMeasuring.set(false);
      this.clearDistances();
    });
  }

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  toggleMeasurement() {
    const command: Command = { type: this.isMeasuring() ? 'measureStop' : 'measureStart' };
    if (!this.socket.send(command)) {
      return;
    }
    this.isMeasuring.update((v) => !v);
    if (!this.isMeasuring()) {
      this.clearDistances();
    }
  }

  private clearDistances() {
    this.distances.clear();
    this.redraw.schedule();
  }
}
