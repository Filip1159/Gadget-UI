import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImuOrientation, ImuVerdict } from '../../../core/protocol';
import { NOT_OPEN, onSocketStatus, socketConnected } from '../../../core/socket/socket-status';
import { SocketService } from '../../../core/socket/socket.service';

/** The robot normally answers ~3 s after IMU_CHECK; give up waiting (frame lost) well after that. */
export const IMU_CHECK_TIMEOUT_MS = 8000;

/** What each verdict means for the person looking at the robot. */
export const IMU_VERDICT_TEXT: Record<ImuVerdict, string> = {
  ok: 'Orientation found: gravity and the spin agree.',
  no_data: 'The IMU did not answer. Check its wiring.',
  moving: 'The robot was not standing still at the start.',
  no_gravity: 'The accelerometer does not read 1 g. Check the IMU.',
  tilted: 'The board is tilted more than 20° off a sensor axis. Mount it level.',
  no_spin: 'The robot did not turn fast enough to tell. Raise the speed and retry.',
  inconsistent:
    'Gravity and the spin disagree: the board is mounted unexpectedly or the gyro sign is reversed.',
  aborted: 'Stopped before it finished.',
};

/**
 * Board orientation check for the IMU (firmware MAPPING.MD 6.1): the robot stands still for a second,
 * spins left in place for about two, then reports which sensor axis is up and which one is its yaw axis.
 * Stop (or any drive command, e.g. Esc) aborts it and the robot stops.
 */
@Component({
  selector: 'imu-check',
  templateUrl: './imu-check.html',
  styleUrl: './imu-check.scss',
})
export class ImuCheck {
  private socket = inject(SocketService);
  private timeout?: ReturnType<typeof setTimeout>;

  running = signal(false);
  result = signal<ImuOrientation | null>(null);
  connected = socketConnected(this.socket);
  canStart = computed(() => this.connected() && !this.running());
  verdictText = computed(() => {
    const result = this.result();
    return result ? IMU_VERDICT_TEXT[result.verdict] : null;
  });

  constructor() {
    this.socket.imuOrient$.pipe(takeUntilDestroyed()).subscribe((result) => {
      this.finish();
      this.result.set(result);
    });

    // The robot rejected the check (moving, IMU offline, ...): nothing more will come.
    this.socket.errors$.pipe(takeUntilDestroyed()).subscribe(() => this.finish());

    onSocketStatus(this.socket, NOT_OPEN, () => this.finish());
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timeout));
  }

  start(): void {
    if (!this.canStart() || !this.socket.send({ type: 'imuCheck' })) {
      return;
    }
    this.result.set(null);
    this.running.set(true);
    this.timeout = setTimeout(() => this.finish(), IMU_CHECK_TIMEOUT_MS);
  }

  stop(): void {
    this.socket.send({ type: 'imuCheckStop' });
  }

  private finish(): void {
    clearTimeout(this.timeout);
    this.running.set(false);
  }
}
