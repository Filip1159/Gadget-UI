import { SensorDirection, Sweep } from '../../../protocol'
import { CHASSIS_POLYGON, Point, SENSOR_BEAM_ANGLE, SENSOR_MOUNTS, WHEELS } from './robot-geometry'

/** Distance from the robot centre to the edge of the canvas, and the longest range that is drawn. */
export const VIEW_RANGE_MM = 600
export const MAX_RANGE_MM = 600

const BACKGROUND = 'gray'
const CHASSIS_COLOR = 'white'
const WHEEL_COLOR = 'black'
const CONE_LINE_WIDTH = 3
const NO_OBSTACLE_COLOR = 'green'

/** Colour of a reading by distance; the first band whose `below` is greater than the reading wins. */
export const RANGE_BANDS = [
    { below: 100, stroke: 'red', fill: '#966' },
    { below: 200, stroke: 'orange', fill: '#986' },
    { below: 300, stroke: 'yellow', fill: '#996' },
    { below: Infinity, stroke: 'green', fill: '#575' },
] as const

export const bandFor = (mm: number) => RANGE_BANDS.find(band => mm < band.below)!

/**
 * Draws the robot and a sweep of sensor readings on a canvas. The robot geometry is in
 * millimetres (robot-geometry.ts); the renderer maps it to `sizePx` logical pixels and backs
 * the canvas with `dpr` device pixels per logical pixel.
 * The robot itself never changes, so it is drawn once into an offscreen layer and copied per frame.
 */
export class SensorRenderer {
    private readonly ctx: CanvasRenderingContext2D
    private readonly scale: number // logical pixels per mm
    private readonly staticLayer: HTMLCanvasElement

    constructor(canvas: HTMLCanvasElement, private readonly sizePx: number, private readonly dpr = 1) {
        this.scale = sizePx / (2 * VIEW_RANGE_MM)
        this.ctx = this.prepare(canvas)
        this.staticLayer = document.createElement('canvas')
        this.drawStaticLayer(this.prepare(this.staticLayer))
    }

    /** Paints the robot and the given sweep (null = out of range). */
    render(sweep: Sweep): void {
        this.ctx.drawImage(this.staticLayer, 0, 0, this.sizePx, this.sizePx)
        sweep.forEach((mm, direction) => this.drawCone(direction, mm))
    }

    private prepare(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
        canvas.width = this.sizePx * this.dpr
        canvas.height = this.sizePx * this.dpr
        const ctx = canvas.getContext('2d')!
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        return ctx
    }

    /** Robot millimetres (origin at the centre) to canvas pixels. */
    private px(p: Point): Point {
        return { x: this.sizePx / 2 + p.x * this.scale, y: this.sizePx / 2 + p.y * this.scale }
    }

    private drawStaticLayer(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = BACKGROUND
        ctx.fillRect(0, 0, this.sizePx, this.sizePx)

        ctx.beginPath()
        CHASSIS_POLYGON.forEach((point, i) => {
            const { x, y } = this.px(point)
            return i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.closePath()
        ctx.fillStyle = CHASSIS_COLOR
        ctx.fill()

        ctx.fillStyle = WHEEL_COLOR
        for (const wheel of WHEELS) {
            const { x, y } = this.px(wheel)
            ctx.fillRect(x, y, wheel.width * this.scale, wheel.height * this.scale)
        }
    }

    private drawCone(direction: SensorDirection, mm: number | null): void {
        const mount = SENSOR_MOUNTS[direction]
        if (!mount) {
            console.error('Unknown sensor direction:', direction)
            return
        }
        const ctx = this.ctx
        const origin = this.px(mount)
        const from = mount.angle - SENSOR_BEAM_ANGLE / 2
        const to = mount.angle + SENSOR_BEAM_ANGLE / 2

        if (mm === null) {
            // Nothing detected within range: dashed full-length outline, no filled cone.
            ctx.strokeStyle = NO_OBSTACLE_COLOR
            ctx.lineWidth = 2
            ctx.setLineDash([6, 6])
            ctx.beginPath()
            ctx.arc(origin.x, origin.y, MAX_RANGE_MM * this.scale, from, to)
            ctx.stroke()
            ctx.setLineDash([])
            return
        }

        const band = bandFor(mm)
        const radius = Math.min(mm, MAX_RANGE_MM) * this.scale

        ctx.strokeStyle = band.stroke
        ctx.fillStyle = band.fill
        ctx.lineWidth = CONE_LINE_WIDTH

        ctx.beginPath()
        ctx.arc(origin.x, origin.y, radius, from, to)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(origin.x, origin.y, radius, from, to)
        ctx.lineTo(origin.x, origin.y)
        ctx.fill()
    }
}
