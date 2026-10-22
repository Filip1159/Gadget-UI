import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SocketStatus } from './socket.service';
import { NOT_OPEN, onSocketStatus, socketConnected } from './socket-status';

describe('socket status helpers', () => {
  const status = signal<SocketStatus>('open');
  beforeEach(() => status.set('open'));

  it('socketConnected follows the status', () => {
    const connected = TestBed.runInInjectionContext(() => socketConnected({ status }));
    expect(connected()).toBe(true);
    status.set('connecting');
    expect(connected()).toBe(false);
    status.set('closed');
    expect(connected()).toBe(false);
    status.set('open');
    expect(connected()).toBe(true);
  });

  it('onSocketStatus runs the reset only in the listed statuses', () => {
    const reset = vi.fn();
    TestBed.runInInjectionContext(() => onSocketStatus({ status }, ['closed'], reset));
    TestBed.tick();
    expect(reset).not.toHaveBeenCalled();
    status.set('connecting');
    TestBed.tick();
    expect(reset).not.toHaveBeenCalled(); // connecting does not count for ['closed']
    status.set('closed');
    TestBed.tick();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('NOT_OPEN covers connecting and closed, and runs once if already disconnected on creation', () => {
    status.set('closed');
    const reset = vi.fn();
    TestBed.runInInjectionContext(() => onSocketStatus({ status }, NOT_OPEN, reset));
    TestBed.tick();
    expect(reset).toHaveBeenCalledTimes(1);
    status.set('connecting');
    TestBed.tick();
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('does not re-run when signals read inside the reset change', () => {
    const other = signal(0);
    const reset = vi.fn(() => other());
    status.set('closed');
    TestBed.runInInjectionContext(() => onSocketStatus({ status }, NOT_OPEN, reset));
    TestBed.tick();
    other.set(1);
    TestBed.tick();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
