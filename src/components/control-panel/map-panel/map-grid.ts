import { MapView } from './map-view'

const STEPS_MM = [100, 1000, 10000, 100000]
/** Grid lines closer together than this on screen are skipped in favour of the next coarser step. */
const MIN_SPACING_PX = 20

/** The grid spacing in mm: the finest of 10 cm / 1 m / 10 m / 100 m that is not cramped at this zoom. */
export const gridStepMm = (scalePxPerMm: number): number =>
  STEPS_MM.find(step => step * scalePxPerMm >= MIN_SPACING_PX) ?? STEPS_MM[STEPS_MM.length - 1]

/** World coordinates of the grid lines (multiples of `step`) that cross the visible area, per axis. */
export const gridLines = (view: MapView, widthPx: number, heightPx: number, step: number) => {
  const a = view.toWorld({ px: 0, py: 0 })
  const b = view.toWorld({ px: widthPx, py: heightPx })
  const range = (from: number, to: number): number[] => {
    const lo = Math.ceil(Math.min(from, to) / step)
    const hi = Math.floor(Math.max(from, to) / step)
    return Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => (lo + i) * step)
  }
  return { x: range(a.x, b.x), y: range(a.y, b.y) }
}

/** "10 cm", "1 m", "10 m" ... for the scale label. */
export const stepLabel = (stepMm: number): string =>
  stepMm >= 1000 ? `${stepMm / 1000} m` : `${stepMm / 10} cm`
