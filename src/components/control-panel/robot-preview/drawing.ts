import { SensorDirection } from '../../../protocol'

const X_CENTER = 300
const Y_CENTER = 300

const X_OFFSET = 250
const Y_OFFSET = 250
const TOTAL_WIDTH = 100
const TOTAL_LENGTH = 100
const CORNER_CUT_WIDTH = 6
const WHEEL_CUT_WIDTH = 19
const WHEEL_CUT_LENGTH = 50
const WHEEL_WIDTH = 16
const WHEEL_LENGTH = 45

const PX_PER_MM = 0.5
const MAX_RANGE_PX = 300

const DISTANCE_SENSOR_BEAM_ANGLE = 25 / 180 * Math.PI

const DIRECTION_CONFIG: Record<SensorDirection, { x: number, y: number, angle: number }> = {
    'FRONT': { x: X_CENTER, y: Y_OFFSET, angle: 1.5 * Math.PI },
    'FRONT_LEFT_45': { x: X_OFFSET + CORNER_CUT_WIDTH / 2, y: Y_OFFSET + CORNER_CUT_WIDTH / 2, angle: 1.25 * Math.PI },
    'FRONT_LEFT': { x: X_OFFSET, y: Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2, angle: Math.PI },
    'FRONT_RIGHT_45': { x: X_OFFSET + TOTAL_WIDTH - CORNER_CUT_WIDTH / 2, y: Y_OFFSET + CORNER_CUT_WIDTH / 2, angle: 1.75 * Math.PI },
    'FRONT_RIGHT': { x: X_OFFSET + TOTAL_WIDTH, y: Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2, angle: 0 },
    'BACK': { x: X_CENTER, y: Y_OFFSET + TOTAL_LENGTH, angle: 0.5 * Math.PI },
    'BACK_LEFT_45': { x: X_OFFSET + CORNER_CUT_WIDTH / 2, y: Y_OFFSET + TOTAL_LENGTH - CORNER_CUT_WIDTH / 2, angle: 0.75 * Math.PI },
    'BACK_LEFT': { x: X_OFFSET, y: Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2, angle: Math.PI },
    'BACK_RIGHT_45': { x: X_OFFSET + TOTAL_WIDTH - CORNER_CUT_WIDTH / 2, y: Y_OFFSET + TOTAL_LENGTH - CORNER_CUT_WIDTH / 2, angle: 0.25 * Math.PI },
    'BACK_RIGHT': { x: X_OFFSET + TOTAL_WIDTH, y: Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2, angle: 0 }
}

export const drawDistance = (distance: number | null, direction: SensorDirection, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    const config = DIRECTION_CONFIG[direction];

    if (!config) {
        console.error('Invalid direction:', direction, 'Available directions:', Object.keys(DIRECTION_CONFIG));
        return;
    }

    ctx.fillStyle = 'gray'
    ctx.beginPath()
    ctx.arc(config.x, config.y, MAX_RANGE_PX, config.angle - DISTANCE_SENSOR_BEAM_ANGLE / 2, config.angle + DISTANCE_SENSOR_BEAM_ANGLE / 2)
    ctx.lineTo(config.x, config.y)
    ctx.fill()

    if (distance === null) {
        // Nothing detected within range: dashed full-length outline, no filled cone.
        ctx.strokeStyle = 'green'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.arc(config.x, config.y, MAX_RANGE_PX, config.angle - DISTANCE_SENSOR_BEAM_ANGLE / 2, config.angle + DISTANCE_SENSOR_BEAM_ANGLE / 2)
        ctx.stroke()
        ctx.setLineDash([])
        return
    }

    if (distance < 100) {
        ctx.strokeStyle = 'red'
        ctx.fillStyle = '#966'
    } else if (distance < 200) {
        ctx.strokeStyle = 'orange'
        ctx.fillStyle = '#986'
    } else if (distance < 300) {
        ctx.strokeStyle = 'yellow'
        ctx.fillStyle = '#996'
    } else {
        ctx.strokeStyle = 'green'
        ctx.fillStyle = '#575'
    }
    ctx.lineWidth = 3

    ctx.beginPath();
    ctx.arc(config.x, config.y, distance * PX_PER_MM, config.angle - DISTANCE_SENSOR_BEAM_ANGLE / 2, config.angle + DISTANCE_SENSOR_BEAM_ANGLE / 2)
    ctx.stroke()
    ctx.beginPath();
    ctx.arc(config.x, config.y, distance * PX_PER_MM, config.angle - DISTANCE_SENSOR_BEAM_ANGLE / 2, config.angle + DISTANCE_SENSOR_BEAM_ANGLE / 2)
    ctx.lineTo(config.x, config.y)
    ctx.fill()
}

 export const drawAll = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, 600, 600);
        ctx.beginPath();
        ctx.moveTo(X_OFFSET + CORNER_CUT_WIDTH, Y_OFFSET);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH - CORNER_CUT_WIDTH, Y_OFFSET);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + CORNER_CUT_WIDTH);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH - WHEEL_CUT_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH - WHEEL_CUT_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + TOTAL_LENGTH - CORNER_CUT_WIDTH);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH - CORNER_CUT_WIDTH, Y_OFFSET + TOTAL_LENGTH);
        ctx.lineTo(X_OFFSET + CORNER_CUT_WIDTH, Y_OFFSET + TOTAL_LENGTH);
        ctx.lineTo(X_OFFSET, Y_OFFSET + TOTAL_LENGTH - CORNER_CUT_WIDTH);
        ctx.lineTo(X_OFFSET, Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + WHEEL_CUT_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + WHEEL_CUT_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET, Y_OFFSET + (TOTAL_LENGTH - WHEEL_CUT_LENGTH) / 2);
        ctx.lineTo(X_OFFSET, Y_OFFSET + CORNER_CUT_WIDTH);
        ctx.fillStyle = 'white';
        ctx.fill();

        // left wheel
        ctx.beginPath();
        ctx.moveTo(X_OFFSET, Y_OFFSET + (TOTAL_LENGTH - WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + WHEEL_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + WHEEL_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET, Y_OFFSET + (TOTAL_LENGTH + WHEEL_LENGTH) / 2);
        ctx.fillStyle = 'black';
        ctx.fill();

        // right wheel
        ctx.beginPath();
        ctx.moveTo(X_OFFSET + TOTAL_WIDTH - WHEEL_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + (TOTAL_LENGTH - WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_LENGTH) / 2);
        ctx.lineTo(X_OFFSET + TOTAL_WIDTH - WHEEL_WIDTH, Y_OFFSET + (TOTAL_LENGTH + WHEEL_LENGTH) / 2);
        ctx.fillStyle = 'black';
        ctx.fill();

    }
