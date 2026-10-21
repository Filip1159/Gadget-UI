import { gridLines, gridStepMm, stepLabel } from './map-grid'
import { MapView } from './map-view'

describe('map grid', () => {
  it('uses 10 cm lines when zoomed in, 1 m by default and coarser when zoomed out', () => {
    expect(gridStepMm(1)).toBe(100)
    expect(gridStepMm(0.3)).toBe(100) // 30 px per 10 cm
    expect(gridStepMm(0.1)).toBe(1000)
    expect(gridStepMm(0.02)).toBe(1000) // 20 px per metre
    expect(gridStepMm(0.01)).toBe(10000)
  })

  it('lists the lines that cross the visible area', () => {
    const view = new MapView(600, 600)
    view.scale = 0.1 // 6 m across, centred on the origin: -3..3 m
    const { x, y } = gridLines(view, 600, 600, 1000)
    expect(x).toEqual([-3000, -2000, -1000, 0, 1000, 2000, 3000])
    expect(y).toEqual(x)
  })

  it('follows the pan', () => {
    const view = new MapView(600, 600)
    view.scale = 0.1
    view.centre = { x: 10000, y: 0 }
    expect(gridLines(view, 600, 600, 1000).x[0]).toBe(7000)
  })

  it('labels the step', () => {
    expect(stepLabel(100)).toBe('10 cm')
    expect(stepLabel(1000)).toBe('1 m')
    expect(stepLabel(10000)).toBe('10 m')
  })
})
