/** Wire protocol shared with the robot firmware (plain space-delimited text, see CLAUDE.md). */

export const DRIVE_DIRECTIONS = [
  'FORWARD', 'FORWARD_LEFT', 'FORWARD_RIGHT', 'LEFT', 'STOP', 'RIGHT',
  'BACKWARD', 'BACKWARD_LEFT', 'BACKWARD_RIGHT',
] as const;
export type DriveDirection = typeof DRIVE_DIRECTIONS[number];

export const SENSOR_DIRECTIONS = [
  'FRONT', 'FRONT_LEFT_45', 'FRONT_LEFT', 'FRONT_RIGHT_45', 'FRONT_RIGHT',
  'BACK', 'BACK_LEFT_45', 'BACK_LEFT', 'BACK_RIGHT_45', 'BACK_RIGHT',
] as const;
export type SensorDirection = typeof SENSOR_DIRECTIONS[number];

/** direction -> mm, null = out of range (no obstacle detected) */
export type Sweep = Map<SensorDirection, number | null>;

export type Command =
  | { type: 'drive'; direction: DriveDirection }
  | { type: 'speed'; value: number }
  | { type: 'pid'; p: number; i: number; d: number }
  | { type: 'measureStart' }
  | { type: 'measureStop' }
  | { type: 'auth'; token: string };

/** Robot state, sent right after (authenticated) connect: "STATE SPEED=1000 P=0.1500 I=0.0500 D=0.0000 MEASURING=0" */
export type RobotState = { speed: number; p: number; i: number; d: number; measuring: boolean };

export type RobotMessage =
  | { type: 'measure'; sweep: Sweep }
  | { type: 'state'; state: RobotState }
  | { type: 'error'; reason: string };

export const encodeCommand = (command: Command): string => {
  switch (command.type) {
    case 'drive': return command.direction;
    case 'speed': return `SPEED ${command.value}`;
    case 'pid': return `PID ${command.p} ${command.i} ${command.d}`;
    case 'measureStart': return 'MEASURE_START';
    case 'measureStop': return 'MEASURE_STOP';
    case 'auth': return `AUTH ${command.token}`;
  }
};

const isSensorDirection = (value: string): value is SensorDirection =>
  (SENSOR_DIRECTIONS as readonly string[]).includes(value);

/**
 * Parses a frame from the robot. Returns undefined for anything unrecognised or malformed;
 * a bad frame must never partially update state, so frames are all-or-nothing.
 * - "MEASURE FRONT=412 FRONT_LEFT_45=OOR ..." (OOR = out of range)
 * - "STATE SPEED=1000 P=0.1500 I=0.0500 D=0.0000 MEASURING=0"
 * - "ERR <reason>"
 */
export const parseMessage = (msg: string): RobotMessage | undefined => {
  const trimmed = msg.trim();
  const [kind, ...tokens] = trimmed.split(/\s+/);
  switch (kind) {
    case 'MEASURE': return parseMeasure(tokens);
    case 'STATE': return parseState(tokens);
    case 'ERR': return { type: 'error', reason: trimmed.slice(3).trim() || 'unknown' };
    default: return undefined;
  }
};

const parseMeasure = (tokens: string[]): RobotMessage | undefined => {
  if (tokens.length === 0) {
    return undefined;
  }
  const sweep: Sweep = new Map();
  for (const token of tokens) {
    const [direction, value, ...rest] = token.split('=');
    if (!direction || value === undefined || rest.length > 0 || !isSensorDirection(direction)) {
      return undefined;
    }
    if (value === 'OOR') {
      sweep.set(direction, null);
    } else if (/^\d+$/.test(value)) {
      sweep.set(direction, parseInt(value, 10));
    } else {
      return undefined;
    }
  }
  return { type: 'measure', sweep };
};

const parseState = (tokens: string[]): RobotMessage | undefined => {
  const fields = new Map<string, string>();
  for (const token of tokens) {
    const [key, value, ...rest] = token.split('=');
    if (!key || value === undefined || rest.length > 0) {
      return undefined;
    }
    fields.set(key, value);
  }
  const number = (key: string): number | undefined => {
    const raw = fields.get(key);
    const n = raw === undefined || raw === '' ? NaN : Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const speed = number('SPEED');
  const p = number('P');
  const i = number('I');
  const d = number('D');
  const measuring = number('MEASURING');
  if (speed === undefined || p === undefined || i === undefined || d === undefined || measuring === undefined) {
    return undefined;
  }
  return { type: 'state', state: { speed, p, i, d, measuring: measuring === 1 } };
};
