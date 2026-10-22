/** Wire protocol shared with the robot firmware (plain space-delimited text, see CLAUDE.md). */

export const DRIVE_DIRECTIONS = [
  'FORWARD',
  'FORWARD_LEFT',
  'FORWARD_RIGHT',
  'LEFT',
  'STOP',
  'RIGHT',
  'BACKWARD',
  'BACKWARD_LEFT',
  'BACKWARD_RIGHT',
] as const;
export type DriveDirection = (typeof DRIVE_DIRECTIONS)[number];

export const SENSOR_DIRECTIONS = [
  'FRONT',
  'FRONT_LEFT_45',
  'FRONT_LEFT',
  'FRONT_RIGHT_45',
  'FRONT_RIGHT',
  'BACK',
  'BACK_LEFT_45',
  'BACK_LEFT',
  'BACK_RIGHT_45',
  'BACK_RIGHT',
] as const;
export type SensorDirection = (typeof SENSOR_DIRECTIONS)[number];

/** direction -> mm, null = out of range (no obstacle detected) */
export type Sweep = Map<SensorDirection, number | null>;

export type Command =
  | { type: 'drive'; direction: DriveDirection }
  | { type: 'speed'; value: number }
  | { type: 'pid'; p: number; i: number; d: number }
  | { type: 'measureStart' }
  | { type: 'measureStop' }
  | { type: 'calibrate'; distanceMm: number; count: number }
  | { type: 'calibrateStop' }
  | { type: 'poseReset' }
  | { type: 'auth'; token: string };

/** Pose at one instant: millimetres, radians counter-clockwise, robot millis(). */
export type PoseSample = { xMm: number; yMm: number; theta: number; tMs: number };

/**
 * Robot pose when a sweep started and when it ended (a sweep takes ~390 ms and the robot may move during it).
 * Sent right before the matching MEASURE frame:
 * "SWEEP_POSE T0=<ms> X0=<mm> Y0=<mm> TH0=<mrad> T1=<ms> X1=<mm> Y1=<mm> TH1=<mrad>"
 */
export type SweepPose = { start: PoseSample; end: PoseSample };

/**
 * Robot pose from odometry, world frame (REP-103): x forward, y left, theta counter-clockwise.
 * "POSE X=<mm> Y=<mm> TH=<mrad> T=<ms> Q=<0|1>" (+ optional RELOC=1 after a reboot that restored a saved pose).
 */
export type Pose = {
  xMm: number;
  yMm: number;
  /** Radians, counter-clockwise. */
  theta: number;
  /** Robot millis() when the pose was taken. */
  tMs: number;
  /** Wheel slip / stall suspected. */
  questionable: boolean;
  /** Pose restored from a reboot, only a guess. */
  relocated: boolean;
};

/** Robot state, sent right after (authenticated) connect: "STATE SPEED=1000 P=0.1500 I=0.0500 D=0.0000 MEASURING=0" */
export type RobotState = { speed: number; p: number; i: number; d: number; measuring: boolean };

export type RobotMessage =
  | { type: 'measure'; sweep: Sweep }
  | { type: 'state'; state: RobotState }
  | { type: 'error'; reason: string }
  | { type: 'calibration'; distanceMm: number; index: number; total: number; sweep: Sweep }
  | { type: 'calibrationDone'; distanceMm: number; done: number }
  | { type: 'pose'; pose: Pose }
  | { type: 'sweepPose'; sweepPose: SweepPose };
