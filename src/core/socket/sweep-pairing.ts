import { RobotMessage, Sweep, SweepPose } from '../protocol';

/** One complete sweep and the robot pose around it; `pose` is null if the robot sent none (older firmware). */
export type PosedSweep = { sweep: Sweep; pose: SweepPose | null };

/**
 * Joins each MEASURE frame with the SWEEP_POSE frame the firmware sends right before it.
 * Other frames (POSE, STATE, ...) may arrive in between and are ignored; a SWEEP_POSE is used at most once
 * and a newer one replaces an unused older one, so a pose can never be paired with the wrong sweep.
 */
export class SweepPairer {
  private pending: SweepPose | null = null;

  /** Feed every robot frame in order; returns a value when a MEASURE frame completes a pair. */
  push(message: RobotMessage): PosedSweep | undefined {
    switch (message.type) {
      case 'sweepPose':
        this.pending = message.sweepPose;
        return undefined;
      case 'measure': {
        const pose = this.pending;
        this.pending = null;
        return { sweep: message.sweep, pose };
      }
      default:
        return undefined;
    }
  }

  /** Forget an unused pose, e.g. after a reconnect. */
  reset(): void {
    this.pending = null;
  }
}
