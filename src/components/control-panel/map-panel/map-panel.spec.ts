import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Pose, Sweep, SweepPose } from '../../../core/protocol';
import { SocketService } from '../../../core/socket/socket.service';
import { MapPanel } from './map-panel';

describe('MapPanel', () => {
  const pose$ = new Subject<Pose>();
  const posedSweeps$ = new Subject<{ sweep: Sweep; pose: SweepPose | null }>();
  const status = signal<'open' | 'closed'>('open');
  let panel: MapPanel;

  const pose = (xMm: number, yMm = 0): Pose => ({
    xMm,
    yMm,
    theta: 0,
    tMs: 0,
    questionable: false,
    relocated: false,
  });

  beforeEach(() => {
    status.set('open');
    TestBed.configureTestingModule({
      providers: [{ provide: SocketService, useValue: { status, pose$, posedSweeps$ } }],
    });
    panel = TestBed.runInInjectionContext(() => new MapPanel());
  });

  it('follows the robot: the latest pose and a growing trail', () => {
    pose$.next(pose(0));
    pose$.next(pose(50));
    expect(panel.pose()?.xMm).toBe(50);
    expect(panel.trail.path.length).toBe(2);
  });

  it('adds the obstacle points of each posed sweep to the cloud', () => {
    const still = { xMm: 0, yMm: 0, theta: 0, tMs: 0 };
    posedSweeps$.next({
      sweep: new Map([['FRONT', 400]]) as Sweep,
      pose: { start: still, end: still },
    });
    expect(panel.cloud.all.length).toBe(1);
    expect(panel.cloud.all[0].x).toBeCloseTo(490);
  });

  it('clears the trail and the cloud on request', () => {
    pose$.next(pose(0));
    pose$.next(pose(50));
    posedSweeps$.next({
      sweep: new Map([['FRONT', 400]]) as Sweep,
      pose: { start: pose(0) as never, end: pose(0) as never },
    });
    panel.clearTrail();
    expect(panel.trail.path).toEqual([]);
    expect(panel.cloud.all).toEqual([]);
  });

  describe('sweep filters', () => {
    const at = (x0: number, x1: number): SweepPose => ({
      start: { xMm: x0, yMm: 0, theta: 0, tMs: 0 },
      end: { xMm: x1, yMm: 0, theta: 0, tMs: 390 },
    });
    const sweep = (mm: number) => new Map([['FRONT', mm]]) as Sweep;

    it('drops sweeps taken while moving when "stationary only" is on', () => {
      panel.stationaryOnly.set(true);
      posedSweeps$.next({ sweep: sweep(400), pose: at(0, 100) });
      expect(panel.cloud.all.length).toBe(0);
      posedSweeps$.next({ sweep: sweep(400), pose: at(0, 3) });
      expect(panel.cloud.all.length).toBe(1);
    });

    it('keeps moving sweeps when the filter is off', () => {
      posedSweeps$.next({ sweep: sweep(400), pose: at(0, 100) });
      expect(panel.cloud.all.length).toBe(1);
    });

    it('ignores readings outside the range limits', () => {
      panel.minRangeMm.set(100);
      panel.maxRangeMm.set(500);
      posedSweeps$.next({ sweep: sweep(50), pose: at(0, 0) });
      posedSweeps$.next({ sweep: sweep(800), pose: at(0, 0) });
      expect(panel.cloud.all.length).toBe(0);
      posedSweeps$.next({ sweep: sweep(300), pose: at(0, 0) });
      expect(panel.cloud.all.length).toBe(1);
    });

    it('takes range limits from number inputs and ignores junk', () => {
      const input = (value: string) => ({ target: { value } }) as unknown as Event;
      panel.setRange('max', input('750'));
      expect(panel.maxRangeMm()).toBe(750);
      panel.setRange('max', input('abc'));
      panel.setRange('max', input('-5'));
      expect(panel.maxRangeMm()).toBe(750);
    });
  });

  it('recentres the view', () => {
    panel.view.pan(30, 30);
    panel.recentre();
    expect(panel.view.centre).toEqual({ x: 0, y: 0 });
  });
});
