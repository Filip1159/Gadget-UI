import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../../core/socket/socket.service';
import { socketConnected } from '../../../core/socket/socket-status';
import { DriveDirection } from '../../../core/protocol';
import { DEFAULT_PID, DEFAULT_SPEED } from '../../../core/config';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faAngleUp, faArrowsToCircle } from '@fortawesome/free-solid-svg-icons';
import { LongPressButton } from './../longpress-button/longpress-button';
import { Slider } from './../slider/slider';
import { KeyboardSteering } from './keyboard-steering';
import { Subject, throttleTime } from 'rxjs';

@Component({
  selector: 'steering',
  imports: [FontAwesomeModule, FormsModule, LongPressButton, Slider],
  templateUrl: './steering.html',
  styleUrl: './steering.scss',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    // keyup is not filtered: if a key was held, releasing it must always stop the robot.
    '(window:keyup)': 'onKeyUp($event)',
    '(window:blur)': 'onBlur()',
    // A hidden tab may not get a blur or keyup, so stop when it goes to the background.
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class Steering {
  faAngleUp = faAngleUp;
  faArrowsToCircle = faArrowsToCircle;

  private socket = inject(SocketService);

  private keyboard = new KeyboardSteering((direction) => this.move(direction));
  private speed$ = new Subject<number>();

  connected = socketConnected(this.socket);

  speed = signal(DEFAULT_SPEED);
  P = signal(DEFAULT_PID.P);
  I = signal(DEFAULT_PID.I);
  D = signal(DEFAULT_PID.D);

  constructor() {
    // The robot's actual settings win over the defaults above.
    this.socket.state$.pipe(takeUntilDestroyed()).subscribe((state) => {
      this.speed.set(state.speed);
      this.P.set(state.p);
      this.I.set(state.i);
      this.D.set(state.d);
    });

    // Slider fires an input event per step while dragging; send at most one per 100ms, keeping the final value.
    this.speed$
      .pipe(throttleTime(100, undefined, { leading: true, trailing: true }), takeUntilDestroyed())
      .subscribe((value) => this.socket.send({ type: 'speed', value }));

    inject(DestroyRef).onDestroy(() => this.keyboard.destroy());
  }

  move(direction: DriveDirection): void {
    this.socket.send({ type: 'drive', direction });
  }

  setSpeed(speed: number): void {
    this.speed.set(speed);
    this.speed$.next(speed);
  }

  // ngModel gives null for an empty number input; never send that to the robot.
  pidValid = computed(() =>
    [this.P(), this.I(), this.D()].every(
      (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
    ),
  );

  setPid() {
    if (!this.pidValid()) {
      return;
    }
    this.socket.send({ type: 'pid', p: this.P(), i: this.I(), d: this.D() });
  }

  // Ignore typing in the PID fields and browser shortcuts such as Ctrl+C / Ctrl+W.
  private isSteeringKey(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    const typing = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    return !typing && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.isSteeringKey(event)) {
      if (event.key === ' ') {
        event.preventDefault(); // Space is the emergency stop, do not also click a focused button
      }
      this.keyboard.keyDown(event.key);
    }
  }

  onKeyUp(event: KeyboardEvent) {
    this.keyboard.keyUp(event.key);
  }

  onBlur() {
    this.keyboard.blur();
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.keyboard.blur();
    }
  }
}
