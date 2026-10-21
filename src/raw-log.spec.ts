import { LOG_MAX_ENTRIES, LogReplayer, parseNdjson, RawLogRecorder } from './raw-log';

describe('RawLogRecorder', () => {
  it('keeps POSE, SWEEP_POSE and MEASURE frames with the time since the first one', () => {
    const rec = new RawLogRecorder();
    expect(rec.add('STATE SPEED=1 P=1 I=1 D=1 MEASURING=0', 500)).toBe(false);
    expect(rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', 1000)).toBe(true);
    expect(rec.add('MEASURE FRONT=400', 1250)).toBe(true);
    expect(rec.add('CAL 300 1/5 FRONT=300', 1300)).toBe(false);
    expect(rec.size).toBe(2);
    expect(rec.toNdjson().split('\n')).toEqual([
      '{"gadgetLog":1}',
      '{"t":0,"frame":"POSE X=0 Y=0 TH=0 T=1 Q=0"}',
      '{"t":250,"frame":"MEASURE FRONT=400"}',
      '',
    ]);
  });

  it('does not match a frame that merely starts with the same letters', () => {
    expect(new RawLogRecorder().add('POSES X=1', 0)).toBe(false);
  });

  it('stops accepting frames when full', () => {
    const rec = new RawLogRecorder();
    for (let i = 0; i < LOG_MAX_ENTRIES + 5; i++) {
      rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', i);
    }
    expect(rec.size).toBe(LOG_MAX_ENTRIES);
    expect(rec.full).toBe(true);
  });

  it('starts a new timeline after clear', () => {
    const rec = new RawLogRecorder();
    rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', 1000);
    rec.clear();
    rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', 9000);
    expect(parseNdjson(rec.toNdjson())).toEqual({ entries: [{ t: 0, frame: 'POSE X=0 Y=0 TH=0 T=1 Q=0' }] });
  });
});

describe('parseNdjson', () => {
  it('round-trips what the recorder wrote', () => {
    const rec = new RawLogRecorder();
    rec.add('POSE X=1 Y=2 TH=3 T=4 Q=0', 10);
    rec.add('MEASURE FRONT=400 BACK=OOR', 60);
    expect(parseNdjson(rec.toNdjson())).toEqual({
      entries: [
        { t: 0, frame: 'POSE X=1 Y=2 TH=3 T=4 Q=0' },
        { t: 50, frame: 'MEASURE FRONT=400 BACK=OOR' },
      ],
    });
  });

  it('rejects files that are not a Gadget log, naming the line', () => {
    expect(parseNdjson('')).toEqual({ error: 'The file is empty' });
    expect(parseNdjson('hello')).toEqual({ error: 'Not a Gadget log (line 1)' });
    expect(parseNdjson('{"gadgetLog":2}')).toEqual({ error: 'Not a Gadget log (line 1)' });
    expect(parseNdjson('{"gadgetLog":1}\nnot json')).toEqual({ error: 'Line 2 is not valid JSON' });
    expect(parseNdjson('{"gadgetLog":1}\n{"t":0}')).toEqual({
      error: 'Line 2 is not a valid entry (needs increasing "t" and a "frame")',
    });
  });

  it('rejects time going backwards, and gives nothing from a partly bad file', () => {
    const text = '{"gadgetLog":1}\n{"t":10,"frame":"POSE X"}\n{"t":5,"frame":"POSE X"}';
    expect('error' in parseNdjson(text)).toBe(true);
  });

  it('accepts CRLF line endings', () => {
    expect(parseNdjson('{"gadgetLog":1}\r\n{"t":0,"frame":"POSE X"}\r\n')).toEqual({ entries: [{ t: 0, frame: 'POSE X' }] });
  });
});

describe('LogReplayer', () => {
  const entries = [
    { t: 0, frame: 'a' },
    { t: 100, frame: 'b' },
    { t: 300, frame: 'c' },
  ];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('replays with the original timing', () => {
    const out: string[] = [];
    const done = vi.fn();
    new LogReplayer().start(entries, f => out.push(f), 1, done);
    expect(out).toEqual(['a']);
    vi.advanceTimersByTime(99);
    expect(out).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(out).toEqual(['a', 'b']);
    vi.advanceTimersByTime(200);
    expect(out).toEqual(['a', 'b', 'c']);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('plays faster with a higher speed', () => {
    const out: string[] = [];
    new LogReplayer().start(entries, f => out.push(f), 4);
    vi.advanceTimersByTime(75);
    expect(out).toEqual(['a', 'b', 'c']);
  });

  it('plays everything at once, in order, at speed 0', () => {
    const out: string[] = [];
    const replayer = new LogReplayer();
    replayer.start(entries, f => out.push(f), 0);
    vi.advanceTimersByTime(0);
    expect(out).toEqual(['a', 'b', 'c']);
    expect(replayer.playing).toBe(false);
  });

  it('stops on request and a restart begins from the top', () => {
    const out: string[] = [];
    const replayer = new LogReplayer();
    replayer.start(entries, f => out.push(f), 1);
    replayer.stop();
    vi.advanceTimersByTime(1000);
    expect(out).toEqual(['a']);
    replayer.start(entries, f => out.push(f), 1);
    expect(out).toEqual(['a', 'a']);
  });
});
