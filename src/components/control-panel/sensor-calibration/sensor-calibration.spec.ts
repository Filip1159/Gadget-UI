import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Command } from '../../../protocol';
import { SocketService } from '../../../socket.service';
import { SensorCalibration } from './sensor-calibration';

describe('SensorCalibration', () => {
  const calibration$ = new Subject<any>();
  const errors$ = new Subject<string>();
  const status = signal<'open' | 'closed'>('open');
  const sent: Command[] = [];
  let component: SensorCalibration;

  beforeEach(() => {
    sent.length = 0;
    status.set('open');
    TestBed.configureTestingModule({
      providers: [{ provide: SocketService, useValue: { status, calibration$, errors$, send: (c: Command) => (sent.push(c), true) } }],
    });
    component = TestBed.runInInjectionContext(() => new SensorCalibration());
  });

  it('sends CAL with the entered numbers and records the streamed sweeps until CAL_DONE', () => {
    component.target.set('FRONT_LEFT');
    component.distanceMm.set(600);
    component.count.set(2);
    component.start();
    expect(sent).toEqual([{ type: 'calibrate', distanceMm: 600, count: 2 }]);
    expect(component.running()).toBe(true);

    calibration$.next({ type: 'calibration', distanceMm: 600, index: 1, total: 2, sweep: new Map([['FRONT_LEFT', 601]]) });
    calibration$.next({ type: 'calibration', distanceMm: 600, index: 2, total: 2, sweep: new Map([['FRONT_LEFT', null]]) });
    calibration$.next({ type: 'calibrationDone', distanceMm: 600, done: 2 });

    expect(component.recordedRows()).toBe(2);
    expect(component.running()).toBe(false);
  });

  it('does not start with invalid numbers', () => {
    component.distanceMm.set(0);
    component.start();
    component.distanceMm.set(300);
    component.count.set(null);
    component.start();
    expect(sent).toEqual([]);
  });

  it('stops waiting when the robot rejects the run', () => {
    component.start();
    expect(component.running()).toBe(true);
    errors$.next('robot moving');
    expect(component.running()).toBe(false);
  });

  it('sends CAL_STOP', () => {
    component.stop();
    expect(sent).toEqual([{ type: 'calibrateStop' }]);
  });
});
