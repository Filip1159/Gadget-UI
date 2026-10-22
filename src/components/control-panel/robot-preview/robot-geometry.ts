import { SensorDirection } from '../../../core/protocol';

/**
 * The robot, in millimetres. Origin = centre of the robot, x to the right, y down the screen,
 * so the front of the robot is at -y. Angles are canvas angles (radians, 0 = +x, clockwise on screen),
 * so "up" (forward) is 1.5 * PI.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SensorMount extends Point {
  /** Direction the sensor looks in. */
  angle: number;
}

export const ROBOT = {
  width: 135,
  length: 180,
  /** Length of the 45 degree cut on each corner (the cut edge itself, not its legs). */
  chamferLength: 18,
  wheelDiameter: 80,
  wheelWidth: 16,
  /** Side sensors sit this far from the front/back edge. */
  sideSensorInset: 35,
} as const;

const HALF_WIDTH = ROBOT.width / 2;
const HALF_LENGTH = ROBOT.length / 2;
/** Each leg of a 45 degree chamfer of the given edge length. */
const CHAMFER_LEG = ROBOT.chamferLength / Math.SQRT2;

/** Body outline: a rectangle with four chamfered corners, clockwise from the top-left. */
export const CHASSIS_POLYGON: readonly Point[] = [
  { x: -HALF_WIDTH + CHAMFER_LEG, y: -HALF_LENGTH },
  { x: HALF_WIDTH - CHAMFER_LEG, y: -HALF_LENGTH },
  { x: HALF_WIDTH, y: -HALF_LENGTH + CHAMFER_LEG },
  { x: HALF_WIDTH, y: HALF_LENGTH - CHAMFER_LEG },
  { x: HALF_WIDTH - CHAMFER_LEG, y: HALF_LENGTH },
  { x: -HALF_WIDTH + CHAMFER_LEG, y: HALF_LENGTH },
  { x: -HALF_WIDTH, y: HALF_LENGTH - CHAMFER_LEG },
  { x: -HALF_WIDTH, y: -HALF_LENGTH + CHAMFER_LEG },
];

/** Wheels: centred on each side (vertically), flush with the side of the body. */
export const WHEELS: readonly Rect[] = [
  {
    x: -HALF_WIDTH,
    y: -ROBOT.wheelDiameter / 2,
    width: ROBOT.wheelWidth,
    height: ROBOT.wheelDiameter,
  },
  {
    x: HALF_WIDTH - ROBOT.wheelWidth,
    y: -ROBOT.wheelDiameter / 2,
    width: ROBOT.wheelWidth,
    height: ROBOT.wheelDiameter,
  },
];

/** Where each sensor is mounted and where it looks. Front/back sensors are centred; 45 degree ones sit in the middle of a chamfer. */
export const SENSOR_MOUNTS: Record<SensorDirection, SensorMount> = {
  FRONT: { x: 0, y: -HALF_LENGTH, angle: 1.5 * Math.PI },
  FRONT_LEFT_45: {
    x: -HALF_WIDTH + CHAMFER_LEG / 2,
    y: -HALF_LENGTH + CHAMFER_LEG / 2,
    angle: 1.25 * Math.PI,
  },
  FRONT_LEFT: { x: -HALF_WIDTH, y: -HALF_LENGTH + ROBOT.sideSensorInset, angle: Math.PI },
  FRONT_RIGHT_45: {
    x: HALF_WIDTH - CHAMFER_LEG / 2,
    y: -HALF_LENGTH + CHAMFER_LEG / 2,
    angle: 1.75 * Math.PI,
  },
  FRONT_RIGHT: { x: HALF_WIDTH, y: -HALF_LENGTH + ROBOT.sideSensorInset, angle: 0 },
  BACK: { x: 0, y: HALF_LENGTH, angle: 0.5 * Math.PI },
  BACK_LEFT_45: {
    x: -HALF_WIDTH + CHAMFER_LEG / 2,
    y: HALF_LENGTH - CHAMFER_LEG / 2,
    angle: 0.75 * Math.PI,
  },
  BACK_LEFT: { x: -HALF_WIDTH, y: HALF_LENGTH - ROBOT.sideSensorInset, angle: Math.PI },
  BACK_RIGHT_45: {
    x: HALF_WIDTH - CHAMFER_LEG / 2,
    y: HALF_LENGTH - CHAMFER_LEG / 2,
    angle: 0.25 * Math.PI,
  },
  BACK_RIGHT: { x: HALF_WIDTH, y: HALF_LENGTH - ROBOT.sideSensorInset, angle: 0 },
};

/** VL53L0X beam cone, full angle. */
export const SENSOR_BEAM_ANGLE = (25 / 180) * Math.PI;
