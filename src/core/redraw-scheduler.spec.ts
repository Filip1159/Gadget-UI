import { RedrawScheduler } from './redraw-scheduler';

describe('RedrawScheduler', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  const runFrame = () => frames.splice(0).forEach((callback) => callback(0));

  it('draws once on the next frame, however often it is scheduled', () => {
    const draw = vi.fn();
    const scheduler = new RedrawScheduler(draw);
    scheduler.schedule();
    scheduler.schedule();
    scheduler.schedule();
    expect(draw).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);
    runFrame();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('can be scheduled again after a frame was drawn', () => {
    const draw = vi.fn();
    const scheduler = new RedrawScheduler(draw);
    scheduler.schedule();
    runFrame();
    scheduler.schedule();
    runFrame();
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it('schedules again when draw itself asks for a redraw', () => {
    const scheduler: RedrawScheduler = new RedrawScheduler(() => {
      if (draws++ === 0) {
        scheduler.schedule();
      }
    });
    let draws = 0;
    scheduler.schedule();
    runFrame();
    runFrame();
    expect(draws).toBe(2);
  });
});
