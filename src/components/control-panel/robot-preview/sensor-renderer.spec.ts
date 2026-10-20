import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sweep } from '../../../protocol'
import { bandFor, MAX_RANGE_MM, SensorRenderer } from './sensor-renderer'

type Call = [string, ...unknown[]]

// Records every call on a 2D context (jsdom has no canvas).
const recordingContext = (calls: Call[]) =>
    new Proxy({}, {
        get: (_t, name: string) => (...args: unknown[]) => { calls.push([name, ...args]) },
        set: (_t, name: string, value: unknown) => { calls.push(['set:' + name, value]); return true },
    }) as unknown as CanvasRenderingContext2D

describe('SensorRenderer', () => {
    let calls: Call[]
    let canvas: HTMLCanvasElement

    beforeEach(() => {
        calls = []
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(recordingContext(calls))
        canvas = document.createElement('canvas')
    })
    afterEach(() => vi.restoreAllMocks())

    it('colour bands follow the distance', () => {
        expect(bandFor(50).stroke).toBe('red')
        expect(bandFor(150).stroke).toBe('orange')
        expect(bandFor(250).stroke).toBe('yellow')
        expect(bandFor(900).stroke).toBe('green')
    })

    it('backs the canvas with device pixels', () => {
        new SensorRenderer(canvas, 600, 2)
        expect(canvas.width).toBe(1200)
        expect(canvas.height).toBe(1200)
        expect(calls).toContainEqual(['setTransform', 2, 0, 0, 2, 0, 0])
    })

    it('draws the robot once and copies it on every render', () => {
        const renderer = new SensorRenderer(canvas, 600)
        const fills = calls.filter(([name]) => name === 'fillRect').length
        calls.length = 0
        renderer.render(new Map())
        renderer.render(new Map())
        expect(calls.filter(([name]) => name === 'drawImage')).toHaveLength(2)
        expect(calls.filter(([name]) => name === 'fillRect')).toHaveLength(0)
        expect(fills).toBeGreaterThan(0)
    })

    it('draws a cone scaled to millimetres, clamped to the max range', () => {
        const renderer = new SensorRenderer(canvas, 600) // 0.5 px per mm
        calls.length = 0
        renderer.render(new Map([['FRONT', 200]]) as Sweep)
        const arc = calls.find(([name]) => name === 'arc')!
        expect(arc[1]).toBeCloseTo(300) // x of the front sensor: canvas centre
        expect(arc[2]).toBeCloseTo(300 - 90 * 0.5) // y: 90mm in front of the centre
        expect(arc[3]).toBeCloseTo(100) // 200mm * 0.5

        calls.length = 0
        renderer.render(new Map([['FRONT', 5000]]) as Sweep)
        expect(calls.find(([name]) => name === 'arc')![3]).toBeCloseTo(MAX_RANGE_MM * 0.5)
    })

    it('draws a dashed outline instead of a cone for out-of-range readings', () => {
        const renderer = new SensorRenderer(canvas, 600)
        calls.length = 0
        renderer.render(new Map([['BACK', null]]) as Sweep)
        expect(calls.some(([name, v]) => name === 'setLineDash' && Array.isArray(v) && v.length === 2)).toBe(true)
        expect(calls.some(([name]) => name === 'fill')).toBe(false)
    })
})
