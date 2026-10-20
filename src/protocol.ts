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
  | { type: 'measureStop' };

export type RobotMessage = { type: 'measure'; sweep: Sweep };

export const encodeCommand = (command: Command): string => {
  switch (command.type) {
    case 'drive': return command.direction;
    case 'speed': return `SPEED ${command.value}`;
    case 'pid': return `PID ${command.p} ${command.i} ${command.d}`;
    case 'measureStart': return 'MEASURE_START';
    case 'measureStop': return 'MEASURE_STOP';
  }
};

const isSensorDirection = (value: string): value is SensorDirection =>
  (SENSOR_DIRECTIONS as readonly string[]).includes(value);

/**
 * Parses a frame from the robot. Returns undefined for anything unrecognised or malformed;
 * a bad frame must never partially update state, so MEASURE is all-or-nothing.
 * MEASURE format: "MEASURE FRONT=412 FRONT_LEFT_45=OOR ..." (OOR = out of range).
 */
export const parseMessage = (msg: string): RobotMessage | undefined => {
  const [kind, ...tokens] = msg.trim().split(/\s+/);
  if (kind !== 'MEASURE' || tokens.length === 0) {
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
