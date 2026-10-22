import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pose, SweepPose } from '../../../core/protocol';
import { NOT_OPEN, onSocketStatus, socketConnected } from '../../../core/socket/socket-status';
import { SocketService } from '../../../core/socket/socket.service';

/** Live odometry pose from the robot (POSE frames) with a button that zeroes it (POSE_RESET). */
@Component({
  selector: 'pose-display',
  templateUrl: './pose-display.html',
  styleUrl: './pose-display.scss',
})
export class PoseDisplay {
  private socket = inject(SocketService);

  pose = signal<Pose | null>(null);
  sweepPose = signal<SweepPose | null>(null);
  /** How far the robot moved / turned while the last sweep was being ranged. */
  sweepMotion = computed(() => {
    const sweep = this.sweepPose();
    if (!sweep) {
      return null;
    }
    const { start, end } = sweep;
    return {
      mm: Math.hypot(end.xMm - start.xMm, end.yMm - start.yMm),
      degrees: ((end.theta - start.theta) * 180) / Math.PI,
      ms: end.tMs - start.tMs,
    };
  });
  /** One line for the collapsed panel. */
  summary = computed(() => {
    const pose = this.pose();
    return pose
      ? `${pose.xMm}, ${pose.yMm} mm \u00b7 ${this.headingDegrees()?.toFixed(0)}\u00b0`
      : '\u2014';
  });
  connected = socketConnected(this.socket);
  headingDegrees = computed(() => {
    const pose = this.pose();
    return pose ? (pose.theta * 180) / Math.PI : null;
  });

  constructor() {
    this.socket.pose$.pipe(takeUntilDestroyed()).subscribe((pose) => this.pose.set(pose));
    this.socket.sweepPose$
      .pipe(takeUntilDestroyed())
      .subscribe((sweepPose) => this.sweepPose.set(sweepPose));

    onSocketStatus(this.socket, NOT_OPEN, () => {
      this.pose.set(null);
      this.sweepPose.set(null);
    });
  }

  reset(): void {
    this.socket.send({ type: 'poseReset' });
  }
}
