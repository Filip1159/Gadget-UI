import { DriveDirection } from '../../../core/protocol';

export const KEY_TO_DIRECTION: Record<string, DriveDirection> = {
  w: 'FORWARD',
  q: 'FORWARD_LEFT',
  e: 'FORWARD_RIGHT',
  a: 'LEFT',
  s: 'STOP',
  ' ': 'STOP',
  escape: 'STOP',
  d: 'RIGHT',
  x: 'BACKWARD',
  z: 'BACKWARD_LEFT',
  c: 'BACKWARD_RIGHT',
};

/**
 * Keyboard -> drive commands, framework-free so it can be unit tested.
 * - keydown sends the direction immediately and repeats it as a heartbeat while held
 *   (the firmware stops on its own if the heartbeat stops)
 * - keyup sends the direction of a key still held, or STOP when none is left
 * - `s`, Space, Esc (and blur / tab hidden) stop everything
 */
export class KeyboardSteering {
  private held: string[] = [];
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private send: (direction: DriveDirection) => void,
    private heartbeatMs = 500,
  ) {}

  keyDown(key: string): void {
    const k = key.toLowerCase();
    const direction = KEY_TO_DIRECTION[k];
    if (!direction || this.held.includes(k)) {
      return; // unmapped key, or auto-repeat of a key already held
    }
    if (direction === 'STOP') {
      this.stopAll();
      return;
    }
    this.held.push(k);
    this.apply();
    this.timer ??= setInterval(() => this.apply(), this.heartbeatMs);
  }

  keyUp(key: string): void {
    const index = this.held.indexOf(key.toLowerCase());
    if (index < 0) {
      return;
    }
    this.held.splice(index, 1);
    if (this.held.length > 0) {
      this.apply();
    } else {
      this.stopAll();
    }
  }

  /** Window lost focus: we will not see the keyup, so stop. */
  blur(): void {
    if (this.held.length > 0) {
      this.stopAll();
    }
  }

  destroy(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.held = [];
  }

  private apply(): void {
    const last = this.held[this.held.length - 1];
    if (last) {
      this.send(KEY_TO_DIRECTION[last]);
    }
  }

  private stopAll(): void {
    this.destroy();
    this.send('STOP');
  }
}
