import { CLOUD_FADE_MS, CLOUD_MAX_POINTS, freshness, PointCloud } from './point-cloud'

describe('PointCloud', () => {
  it('stamps points with the time they were added', () => {
    const cloud = new PointCloud()
    cloud.add([{ x: 1, y: 2 }], 1000)
    expect(cloud.all).toEqual([{ x: 1, y: 2, addedAt: 1000 }])
  })

  it('is bounded: the oldest points go first', () => {
    const cloud = new PointCloud()
    cloud.add(Array.from({ length: CLOUD_MAX_POINTS + 5 }, (_, i) => ({ x: i, y: 0 })), 0)
    expect(cloud.all.length).toBe(CLOUD_MAX_POINTS)
    expect(cloud.all[0].x).toBe(5)
  })

  it('clears', () => {
    const cloud = new PointCloud()
    cloud.add([{ x: 1, y: 1 }], 0)
    cloud.clear()
    expect(cloud.all).toEqual([])
  })

  it('fades points with age', () => {
    expect(freshness(0, 0)).toBe(1)
    expect(freshness(0, CLOUD_FADE_MS / 2)).toBeCloseTo(0.5)
    expect(freshness(0, CLOUD_FADE_MS * 3)).toBe(0)
  })
})
