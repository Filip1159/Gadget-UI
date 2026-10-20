import { KeyboardSteering } from './keyboard-steering';

describe('KeyboardSteering', () => {
  let sent: string[];
  let kb: KeyboardSteering;

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    kb = new KeyboardSteering(d => sent.push(d), 500);
  });
  afterEach(() => { kb.destroy(); vi.useRealTimers(); });

  it('sends on keydown, repeats as heartbeat, STOP on keyup', () => {
    kb.keyDown('w');
    vi.advanceTimersByTime(1000);
    kb.keyUp('w');
    expect(sent).toEqual(['FORWARD', 'FORWARD', 'FORWARD', 'STOP']);
    vi.advanceTimersByTime(5000);
    expect(sent.length).toBe(4);
  });

  it('is case-insensitive and ignores auto-repeat and unmapped keys', () => {
    kb.keyDown('W');
    kb.keyDown('W');
    kb.keyDown('p');
    expect(sent).toEqual(['FORWARD']);
  });

  it('falls back to the remaining held key', () => {
    kb.keyDown('w');
    kb.keyDown('q');
    kb.keyUp('q');
    expect(sent).toEqual(['FORWARD', 'FORWARD_LEFT', 'FORWARD']);
    kb.keyUp('w');
    expect(sent.at(-1)).toBe('STOP');
  });

  it('s and blur stop everything', () => {
    kb.keyDown('w');
    kb.keyDown('s');
    expect(sent.at(-1)).toBe('STOP');
    vi.advanceTimersByTime(2000);
    expect(sent.length).toBe(2);

    kb.keyDown('a');
    kb.blur();
    expect(sent.at(-1)).toBe('STOP');
    kb.blur();
    expect(sent.filter(s => s === 'STOP').length).toBe(2);
  });

  it('Space and Escape are emergency stops', () => {
    kb.keyDown('w');
    kb.keyDown(' ');
    expect(sent.at(-1)).toBe('STOP');
    kb.keyDown('w');
    kb.keyDown('Escape');
    expect(sent.at(-1)).toBe('STOP');
    vi.advanceTimersByTime(2000);
    expect(sent.filter(s => s === 'FORWARD').length).toBe(2);
  });
});
