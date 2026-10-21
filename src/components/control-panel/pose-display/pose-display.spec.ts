import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Command, Pose } from '../../../protocol';
import { SocketService } from '../../../socket.service';
import { PoseDisplay } from './pose-display';

describe('PoseDisplay', () => {
  const pose$ = new Subject<Pose>();
  const status = signal<'open' | 'closed'>('open');
  const sent: Command[] = [];
  let component: PoseDisplay;

  beforeEach(() => {
    sent.length = 0;
    status.set('open');
    TestBed.configureTestingModule({
      providers: [{ provide: SocketService, useValue: { status, pose$, send: (c: Command) => (sent.push(c), true) } }],
    });
    component = TestBed.runInInjectionContext(() => new PoseDisplay());
  });

  it('shows the latest pose and converts the heading to degrees', () => {
    pose$.next({ xMm: 100, yMm: -5, theta: Math.PI / 2, tMs: 1, questionable: false, relocated: false });
    expect(component.pose()?.xMm).toBe(100);
    expect(component.headingDegrees()).toBeCloseTo(90);
  });

  it('sends POSE_RESET', () => {
    component.reset();
    expect(sent).toEqual([{ type: 'poseReset' }]);
  });
});
