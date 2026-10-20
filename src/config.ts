/** Frontend defaults. The robot's real values arrive in its STATE frame; these are only placeholders. */
export const DEFAULT_ROBOT_URL = 'ws://192.168.1.16:88'

/** Must match MAX_SPEED in the firmware (anything above is clamped there). */
export const MAX_SPEED = 2000
export const SPEED_STEP = 100

export const DEFAULT_SPEED = 1000
export const DEFAULT_PID = { P: 0.15, I: 0.05, D: 0 }
