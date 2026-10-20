import { LongPressButton } from './longpress-button';

describe('LongPressButton', () => {
  let button: LongPressButton;
  let presses: number;
  let releases: number;

  beforeEach(() => {
    vi.useFakeTimers();
    button = new LongPressButton();
    presses = 0;
    releases = 0;
    button.press.subscribe(() => presses++);
    button.release.subscribe(() => releases++);
  });

  afterEach(() => vi.useRealTimers());

  it('emits immediately, repeats while held, and releases once', () => {
    button.onPressStart();
    vi.advanceTimersByTime(0);
    expect(presses).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(presses).toBe(3);
    button.onPressEnd();
    vi.advanceTimersByTime(2000);
    expect(presses).toBe(3);
    expect(releases).toBe(1);
  });

  it('ignores a second start while pressed (no leaked timer)', () => {
    button.onPressStart();
    button.onPressStart();
    vi.advanceTimersByTime(500);
    expect(presses).toBe(2);
    button.onPressEnd();
    vi.advanceTimersByTime(5000);
    expect(presses).toBe(2);
  });

  it('only releases if a press was started, and on destroy', () => {
    button.onPressEnd();
    expect(releases).toBe(0);
    button.onPressStart();
    button.ngOnDestroy();
    expect(releases).toBe(1);
  });
});
