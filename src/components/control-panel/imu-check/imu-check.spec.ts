import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Command, ImuOrientation } from '../../../core/protocol';
import { SocketService } from '../../../core/socket/socket.service';
import { IMU_CHECK_TIMEOUT_MS, ImuCheck } from './imu-check';

describe('ImuCheck', () => {
  const imuOrient$ = new Subject<ImuOrientation>();
  const errors$ = new Subject<string>();
  const status = signal<'open' | 'closed'>('open');
  const sent: Command[] = [];
  let sendOk = true;
  let component: ImuCheck;

  const ok: ImuOrientation = { verdict: 'ok', up: '+Z', yaw: '+Z', tiltDeg: 2, rateDps: 85 };

  beforeEach(() => {
    vi.useFakeTimers();
    sent.length = 0;
    sendOk = true;
    status.set('open');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SocketService,
          useValue: {
            status,
            imuOrient$,
            errors$,
            send: (c: Command) => (sent.push(c), sendOk),
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ImuCheck());
  });

  afterEach(() => vi.useRealTimers());

  it('sends IMU_CHECK and shows the running state', () => {
    component.start();
    expect(sent).toEqual([{ type: 'imuCheck' }]);
    expect(component.running()).toBe(true);
    expect(component.canStart()).toBe(false);
  });

  it('does not start while a check runs, or when the command was not sent', () => {
    component.start();
    component.start();
    expect(sent).toHaveLength(1);

    component.stop();
    imuOrient$.next({ ...ok, verdict: 'aborted', up: null, yaw: null });
    sendOk = false;
    component.start();
    expect(component.running()).toBe(false);
  });

  it('shows the result and stops running when the robot answers', () => {
    component.start();
    imuOrient$.next(ok);
    expect(component.running()).toBe(false);
    expect(component.result()).toEqual(ok);
    expect(component.verdictText()).toContain('Orientation found');
  });

  it('forgets the previous result when a new check starts', () => {
    component.start();
    imuOrient$.next(ok);
    component.start();
    expect(component.result()).toBeNull();
  });

  it('sends IMU_CHECK_STOP', () => {
    component.stop();
    expect(sent).toEqual([{ type: 'imuCheckStop' }]);
  });

  it('stops running when the robot rejects the check', () => {
    component.start();
    errors$.next('robot moving');
    expect(component.running()).toBe(false);
    expect(component.result()).toBeNull();
  });

  it('stops running when the connection drops', () => {
    component.start();
    status.set('closed');
    TestBed.tick();
    expect(component.running()).toBe(false);
  });

  it('gives up waiting if the answer never arrives', () => {
    component.start();
    vi.advanceTimersByTime(IMU_CHECK_TIMEOUT_MS - 1);
    expect(component.running()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(component.running()).toBe(false);
  });

  it('cannot start while disconnected', () => {
    status.set('closed');
    expect(component.canStart()).toBe(false);
    component.start();
    expect(sent).toEqual([]);
  });
});
