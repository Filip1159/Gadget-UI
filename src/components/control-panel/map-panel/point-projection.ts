import { PoseSample, SENSOR_DIRECTIONS, SweepPose } from '../../../protocol'
import { PosedSweep } from '../../../sweep-pairing'
import { SENSOR_MOUNTS } from '../robot-preview/robot-geometry'
import { WorldPoint } from './map-view'

/** The pose at fraction `t` (0..1) of a sweep: linear in x and y, heading along the shorter way round. */
export const interpolatePose = (start: PoseSample, end: PoseSample, t: number) => {
  let dTheta = end.theta - start.theta
  dTheta -= 2 * Math.PI * Math.round(dTheta / (2 * Math.PI))
  return {
    x: start.xMm + (end.xMm - start.xMm) * t,
    y: start.yMm + (end.yMm - start.yMm) * t,
    theta: start.theta + dTheta * t,
  }
}

/** One in-range reading in the odometry frame (mm): the beam runs from the sensor (`from`) to the obstacle (`to`). */
export type Reading = { from: WorldPoint; to: WorldPoint; mm: number }

/**
 * Turns every in-range reading of a sweep into a world-frame ray: the hit lies `mm` along the sensor's beam from its
 * mount on the robot, at the robot pose of the moment that sensor was ranged. Sensors are ranged one after another,
 * so sensor i of n is taken at fraction (i + 0.5) / n of the sweep. Out-of-range readings are skipped, and so is a
 * sweep without a pose (older firmware): it cannot be placed.
 */
export const projectReadings = ({ sweep, pose }: PosedSweep): Reading[] => {
  if (!pose) {
    return []
  }
  const readings: Reading[] = []
  const n = SENSOR_DIRECTIONS.length
  SENSOR_DIRECTIONS.forEach((direction, i) => {
    const mm = sweep.get(direction)
    if (mm === undefined || mm === null) {
      return
    }
    const mount = SENSOR_MOUNTS[direction]
    const at = interpolatePose(pose.start, pose.end, (i + 0.5) / n)
    const cos = Math.cos(at.theta)
    const sin = Math.sin(at.theta)
    const toWorld = (forward: number, left: number): WorldPoint => ({
      x: at.x + forward * cos - left * sin,
      y: at.y + forward * sin + left * cos,
    })
    // Mount geometry has x to the right, the front at -y and canvas angles (0 = +x, clockwise on screen).
    readings.push({
      from: toWorld(-mount.y, -mount.x),
      to: toWorld(-mount.y + mm * -Math.sin(mount.angle), -mount.x + mm * -Math.cos(mount.angle)),
      mm,
    })
  })
  return readings
}

/** The obstacle points of a sweep (see `projectReadings`). */
export const projectSweep = (posed: PosedSweep): WorldPoint[] => projectReadings(posed).map(r => r.to)

/** Keeps readings whose distance is within [minMm, maxMm]. */
export const clipRange = (readings: Reading[], minMm: number, maxMm: number): Reading[] =>
  readings.filter(r => r.mm >= minMm && r.mm <= maxMm)

/** How far the robot moved and turned while a sweep was being ranged. */
export const sweepMotion = ({ start, end }: SweepPose) => ({
  mm: Math.hypot(end.xMm - start.xMm, end.yMm - start.yMm),
  rad: Math.abs(end.theta - start.theta),
})

/** True when the robot moved less than `maxMm` and turned less than `maxRad` during the sweep. */
export const isStationary = (pose: SweepPose, maxMm: number, maxRad: number): boolean => {
  const motion = sweepMotion(pose)
  return motion.mm <= maxMm && motion.rad <= maxRad
}
