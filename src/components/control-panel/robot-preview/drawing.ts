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

const DISTANCE_SENSOR_BEAM_ANGLE = 25 / 180 * Math.PI

const DISTANCE_POSITIONS = {
    'FRONT': { x: 280, y: 90 },
    'FRONT_LEFT_45': { x: 40, y: 100 },
    'FRONT_LEFT': { x: 25, y: 200 },
    'FRONT_RIGHT_45': { x: 500, y: 100 },
    'FRONT_RIGHT': { x: 510, y: 200 },
    'BACK': { x: 280, y: 540 },
    'BACK_LEFT_45': { x: 40, y: 520 },
    'BACK_LEFT': { x: 25, y: 430 },
    'BACK_RIGHT_45': { x: 500, y: 520 },
    'BACK_RIGHT': { x: 510, y: 430 },
}

const DIRECTION_CONFIG = {
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

export const drawDistance = (distance: number, direction: string, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    // const position = DISTANCE_POSITIONS[direction as keyof typeof DISTANCE_POSITIONS];
    // ctx.fillStyle = 'gray';
    // ctx.fillRect(position.x, position.y, 66, -40)
    // ctx.fillStyle = 'red';
    // ctx.font = "40px sans-serif";
    // ctx.beginPath();
    // const distanceString = distance >= 1000 ? '?' : distance.toString()
    // ctx.fillText(distanceString, position.x, position.y);
    // ctx.fill();
    const config = DIRECTION_CONFIG[direction as keyof typeof DIRECTION_CONFIG];

    ctx.fillStyle = 'gray'
    ctx.beginPath()
    ctx.arc(config.x, config.y, 300, config.angle - DISTANCE_SENSOR_BEAM_ANGLE / 2, config.angle + DISTANCE_SENSOR_BEAM_ANGLE / 2)
    ctx.lineTo(config.x, config.y)
    ctx.fill()

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

export const drawArrowLeftForward = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(50, 210)
        ctx.lineTo(90, 250);
        ctx.lineTo(70, 250);
        ctx.lineTo(70, 290);
        ctx.lineTo(30, 290);
        ctx.lineTo(30, 250);
        ctx.lineTo(10, 250);
        ctx.lineTo(50, 210);
        ctx.fill();
    }

export const drawArrowLeftBackward = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(50, 390)
        ctx.lineTo(90, 350);
        ctx.lineTo(70, 350);
        ctx.lineTo(70, 310);
        ctx.lineTo(30, 310);
        ctx.lineTo(30, 350);
        ctx.lineTo(10, 350);
        ctx.lineTo(50, 390);
        ctx.fill();
    }

export const drawArrowRightForward = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(550, 210)
        ctx.lineTo(510, 250);
        ctx.lineTo(530, 250);
        ctx.lineTo(530, 290);
        ctx.lineTo(570, 290);
        ctx.lineTo(570, 250);
        ctx.lineTo(590, 250);
        ctx.lineTo(550, 210);
        ctx.fill();
    }

export const drawArrowRightBackward = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(550, 390)
        ctx.lineTo(510, 350);
        ctx.lineTo(530, 350);
        ctx.lineTo(530, 310);
        ctx.lineTo(570, 310);
        ctx.lineTo(570, 350);
        ctx.lineTo(590, 350);
        ctx.lineTo(550, 390);
        ctx.fill();
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

        // drawArrowLeftForward(canvas);
        // drawArrowLeftBackward(canvas);
        // drawArrowRightForward(canvas);
        // drawArrowRightBackward(canvas);
    }
