import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pose } from '../../../protocol';
import { SocketService } from '../../../socket.service';

/** Live odometry pose from the robot (POSE frames) with a button that zeroes it (POSE_RESET). */
@Component({
  selector: 'pose-display',
  templateUrl: './pose-display.html',
  styleUrl: './pose-display.scss',
})
export class PoseDisplay {
  private socket = inject(SocketService);

  pose = signal<Pose | null>(null);
  connected = computed(() => this.socket.status() === 'open');
  headingDegrees = computed(() => {
    const pose = this.pose();
    return pose ? (pose.theta * 180) / Math.PI : null;
  });

  constructor() {
    this.socket.pose$.pipe(takeUntilDestroyed()).subscribe(pose => this.pose.set(pose));

    effect(() => {
      if (this.socket.status() !== 'open') {
        this.pose.set(null);
      }
    });
  }

  reset(): void {
    this.socket.send({ type: 'poseReset' });
  }
}
