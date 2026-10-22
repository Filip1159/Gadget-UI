/**
 * Raw robot log (MAPPING.MD 2.5): the wire text of every POSE / SWEEP_POSE / MEASURE frame with the time it arrived,
 * as NDJSON, so a drive can be replayed into the app (or a test) later. Frames are stored as received, not parsed,
 * so a replay goes through exactly the same parsing and pairing as live data.
 *
 *   {"gadgetLog":1}
 *   {"t":0,"frame":"POSE X=0 Y=0 TH=0 T=1000 Q=0"}
 *   {"t":15,"frame":"SWEEP_POSE T0=1000 ..."}
 */

export type LogEntry = { t: number; frame: string };

const VERSION = 1;
const HEADER = JSON.stringify({ gadgetLog: VERSION });
/** First word of the frames worth recording. */
const RECORDED = new Set(['POSE', 'SWEEP_POSE', 'MEASURE']);
export const LOG_MAX_ENTRIES = 50_000;

/** Collects frames; `t` is milliseconds since the first recorded frame. */
export class RawLogRecorder {
  private entries: LogEntry[] = [];
  private startedAt?: number;

  get size(): number {
    return this.entries.length;
  }

  get full(): boolean {
    return this.entries.length >= LOG_MAX_ENTRIES;
  }

  /** Records the frame if it is one of the logged kinds (and there is room); returns whether it was kept. */
  add(frame: string, now: number): boolean {
    const word = frame.trim().split(/\s+/, 1)[0];
    if (!RECORDED.has(word) || this.full) {
      return false;
    }
    this.startedAt ??= now;
    this.entries.push({ t: now - this.startedAt, frame: frame.trim() });
    return true;
  }

  clear(): void {
    this.entries = [];
    this.startedAt = undefined;
  }

  toNdjson(): string {
    return [HEADER, ...this.entries.map((e) => JSON.stringify(e))].join('\n') + '\n';
  }
}

/** Parses a log file. All-or-nothing: returns an error naming the first bad line instead of a partial log. */
export const parseNdjson = (text: string): { entries: LogEntry[] } | { error: string } => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { error: 'The file is empty' };
  }
  try {
    if (JSON.parse(lines[0])?.gadgetLog !== VERSION) {
      return { error: 'Not a Gadget log (line 1)' };
    }
  } catch {
    return { error: 'Not a Gadget log (line 1)' };
  }
  const entries: LogEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    let value: unknown;
    try {
      value = JSON.parse(lines[i]);
    } catch {
      return { error: `Line ${i + 1} is not valid JSON` };
    }
    const entry = value as Partial<LogEntry> | null;
    const previous = entries[entries.length - 1]?.t ?? 0;
    if (
      typeof entry?.t !== 'number' ||
      !Number.isFinite(entry.t) ||
      entry.t < previous ||
      typeof entry.frame !== 'string' ||
      entry.frame === ''
    ) {
      return { error: `Line ${i + 1} is not a valid entry (needs increasing "t" and a "frame")` };
    }
    entries.push({ t: entry.t, frame: entry.frame });
  }
  return { entries };
};

/** Feeds a log to `emit` with the original timing divided by `speed` (0 = as fast as possible, still in order). */
export class LogReplayer {
  private timer?: ReturnType<typeof setTimeout>;
  private index = 0;
  private running = false;

  get playing(): boolean {
    return this.running;
  }

  start(
    entries: readonly LogEntry[],
    emit: (frame: string) => void,
    speed: number,
    onDone: () => void = () => {},
  ): void {
    this.stop();
    this.index = 0;
    this.running = true;
    const finish = () => {
      this.running = false;
      onDone();
    };
    const step = () => {
      if (!this.running) {
        return;
      }
      // Instant replay is one synchronous pass, so it is complete when start() returns.
      while (this.index < entries.length) {
        const entry = entries[this.index++];
        emit(entry.frame);
        const next = entries[this.index];
        if (!next) {
          break;
        }
        if (speed > 0) {
          this.timer = setTimeout(step, (next.t - entry.t) / speed);
          return;
        }
      }
      finish();
    };
    step();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timer);
  }
}
