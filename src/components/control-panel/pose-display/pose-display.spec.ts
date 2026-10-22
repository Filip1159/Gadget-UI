import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Command, Pose, SweepPose } from '../../../core/protocol';
import { SocketService } from '../../../core/socket/socket.service';
import { PoseDisplay } from './pose-display';

describe('PoseDisplay', () => {
  const pose$ = new Subject<Pose>();
  const sweepPose$ = new Subject<SweepPose>();
  const status = signal<'open' | 'closed'>('open');
  const sent: Command[] = [];
  let component: PoseDisplay;

  beforeEach(() => {
    sent.length = 0;
    status.set('open');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SocketService,
          useValue: { status, pose$, sweepPose$, send: (c: Command) => (sent.push(c), true) },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new PoseDisplay());
  });

  it('shows the latest pose and converts the heading to degrees', () => {
    pose$.next({
      xMm: 100,
      yMm: -5,
      theta: Math.PI / 2,
      tMs: 1,
      questionable: false,
      relocated: false,
    });
    expect(component.pose()?.xMm).toBe(100);
    expect(component.headingDegrees()).toBeCloseTo(90);
  });

  it('shows how far the robot moved during the last sweep', () => {
    sweepPose$.next({
      start: { xMm: 0, yMm: 0, theta: 0, tMs: 1000 },
      end: { xMm: 30, yMm: 40, theta: Math.PI / 180, tMs: 1390 },
    });
    expect(component.sweepMotion()).toEqual({ mm: 50, degrees: expect.closeTo(1), ms: 390 });
  });

  it('sends POSE_RESET', () => {
    component.reset();
    expect(sent).toEqual([{ type: 'poseReset' }]);
  });
});
