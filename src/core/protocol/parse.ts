import { intField, keyValueFields, numberField } from './fields';
import { PoseSample, RobotMessage, SENSOR_DIRECTIONS, SensorDirection, Sweep } from './types';

const isSensorDirection = (value: string): value is SensorDirection =>
  (SENSOR_DIRECTIONS as readonly string[]).includes(value);

/**
 * Parses a frame from the robot. Returns undefined for anything unrecognised or malformed;
 * a bad frame must never partially update state, so frames are all-or-nothing.
 * - "MEASURE FRONT=412 FRONT_LEFT_45=OOR ..." (OOR = out of range)
 * - "STATE SPEED=1000 P=0.1500 I=0.0500 D=0.0000 MEASURING=0"
 * - "ERR <reason>"
 * - "POSE X=120 Y=-4 TH=-31 T=123456 Q=0"
 * - "SWEEP_POSE T0=.. X0=.. Y0=.. TH0=.. T1=.. X1=.. Y1=.. TH1=.." (sent right before the MEASURE frame it belongs to)
 * - "CAL <distance_mm> <i>/<n> FRONT=412 ..." (one sweep of a sensor characterisation run) and "CAL_DONE <distance_mm> <done>"
 *
 * To add a frame: write a `parseXxx(tokens)` on top of `fields.ts`, add its case here, and add specs
 * for a valid and a malformed frame to protocol.spec.ts.
 */
export const parseMessage = (msg: string): RobotMessage | undefined => {
  const trimmed = msg.trim();
  const [kind, ...tokens] = trimmed.split(/\s+/);
  switch (kind) {
    case 'MEASURE':
      return parseMeasure(tokens);
    case 'STATE':
      return parseState(tokens);
    case 'CAL':
      return parseCalibration(tokens);
    case 'CAL_DONE':
      return parseCalibrationDone(tokens);
    case 'POSE':
      return parsePose(tokens);
    case 'SWEEP_POSE':
      return parseSweepPose(tokens);
    case 'ERR':
      return { type: 'error', reason: trimmed.slice(3).trim() || 'unknown' };
    default:
      return undefined;
  }
};

const parseMeasure = (tokens: string[]): RobotMessage | undefined => {
  const fields = tokens.length > 0 ? keyValueFields(tokens, { allowDuplicates: true }) : undefined;
  if (!fields) {
    return undefined;
  }
  const sweep: Sweep = new Map();
  for (const [direction, value] of fields) {
    if (!isSensorDirection(direction)) {
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

const parsePose = (tokens: string[]): RobotMessage | undefined => {
  const fields = keyValueFields(tokens);
  if (!fields) {
    return undefined;
  }
  const x = intField(fields, 'X', { signed: true });
  const y = intField(fields, 'Y', { signed: true });
  const th = intField(fields, 'TH', { signed: true });
  const t = intField(fields, 'T');
  const q = intField(fields, 'Q');
  const reloc = fields.has('RELOC') ? intField(fields, 'RELOC') : 0;
  if (
    x === undefined ||
    y === undefined ||
    th === undefined ||
    t === undefined ||
    (q !== 0 && q !== 1) ||
    (reloc !== 0 && reloc !== 1)
  ) {
    return undefined;
  }
  return {
    type: 'pose',
    pose: {
      xMm: x,
      yMm: y,
      theta: th / 1000,
      tMs: t,
      questionable: q === 1,
      relocated: reloc === 1,
    },
  };
};

const parseSweepPose = (tokens: string[]): RobotMessage | undefined => {
  const fields = keyValueFields(tokens);
  if (!fields || fields.size !== 8) {
    return undefined;
  }
  const sampleAt = (suffix: '0' | '1'): PoseSample | undefined => {
    const t = intField(fields, 'T' + suffix);
    const x = intField(fields, 'X' + suffix, { signed: true });
    const y = intField(fields, 'Y' + suffix, { signed: true });
    const th = intField(fields, 'TH' + suffix, { signed: true });
    return t === undefined || x === undefined || y === undefined || th === undefined
      ? undefined
      : { xMm: x, yMm: y, theta: th / 1000, tMs: t };
  };
  const start = sampleAt('0');
  const end = sampleAt('1');
  return start && end ? { type: 'sweepPose', sweepPose: { start, end } } : undefined;
};

const parseCalibration = (tokens: string[]): RobotMessage | undefined => {
  const [distance, progress, ...sensors] = tokens;
  const match = /^(\d+)\/(\d+)$/.exec(progress ?? '');
  if (!/^\d+$/.test(distance ?? '') || !match) {
    return undefined;
  }
  const measure = parseMeasure(sensors);
  if (measure?.type !== 'measure') {
    return undefined;
  }
  return {
    type: 'calibration',
    distanceMm: parseInt(distance, 10),
    index: parseInt(match[1], 10),
    total: parseInt(match[2], 10),
    sweep: measure.sweep,
  };
};

const parseCalibrationDone = (tokens: string[]): RobotMessage | undefined => {
  const [distance, done, ...rest] = tokens;
  if (rest.length > 0 || !/^\d+$/.test(distance ?? '') || !/^\d+$/.test(done ?? '')) {
    return undefined;
  }
  return { type: 'calibrationDone', distanceMm: parseInt(distance, 10), done: parseInt(done, 10) };
};

const parseState = (tokens: string[]): RobotMessage | undefined => {
  const fields = keyValueFields(tokens);
  if (!fields) {
    return undefined;
  }
  const speed = numberField(fields, 'SPEED');
  const p = numberField(fields, 'P');
  const i = numberField(fields, 'I');
  const d = numberField(fields, 'D');
  const measuring = numberField(fields, 'MEASURING');
  if (
    speed === undefined ||
    p === undefined ||
    i === undefined ||
    d === undefined ||
    measuring === undefined
  ) {
    return undefined;
  }
  return { type: 'state', state: { speed, p, i, d, measuring: measuring === 1 } };
};
