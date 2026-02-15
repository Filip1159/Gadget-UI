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

export const drawDistance = (distance: number, direction: string, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!
    const position = DISTANCE_POSITIONS[direction as keyof typeof DISTANCE_POSITIONS];
    ctx.fillStyle = 'gray';
    ctx.fillRect(position.x, position.y, 66, -40)
    ctx.fillStyle = 'red';
    ctx.font = "40px sans-serif";
    ctx.beginPath();
    const distanceString = distance >= 1000 ? '?' : distance.toString()
    ctx.fillText(distanceString, position.x, position.y);
    ctx.fill();
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
        ctx.moveTo(125, 100);
        ctx.lineTo(475, 100);
        ctx.lineTo(500, 120);
        ctx.lineTo(500, 200);
        ctx.lineTo(425, 200);
        ctx.lineTo(425, 400);
        ctx.lineTo(500, 400);
        ctx.lineTo(500, 475);
        ctx.lineTo(475, 500);
        ctx.lineTo(125, 500);
        ctx.lineTo(100, 475);
        ctx.lineTo(100, 400);
        ctx.lineTo(175, 400);
        ctx.lineTo(175, 200);
        ctx.lineTo(100, 200);
        ctx.lineTo(100, 125);
        ctx.lineTo(125, 100);
        ctx.fillStyle = 'white';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(100, 210);
        ctx.lineTo(165, 210);
        ctx.lineTo(165, 390);
        ctx.lineTo(100, 390);
        ctx.lineTo(100, 210);
        ctx.fillStyle = 'black';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(435, 210);
        ctx.lineTo(500, 210);
        ctx.lineTo(500, 390);
        ctx.lineTo(435, 390);
        ctx.lineTo(435, 210);
        ctx.fillStyle = 'black';
        ctx.fill();

        drawArrowLeftForward(canvas);
        drawArrowLeftBackward(canvas);
        drawArrowRightForward(canvas);
        drawArrowRightBackward(canvas);
        // drawDistance(150, 'front', canvas);
        // drawDistance(100, 'frontLeft45', canvas);
        // drawDistance(50, 'frontLeft', canvas);
        // drawDistance(120, 'frontRight45', canvas);
        // drawDistance(80, 'frontRight', canvas);
        // drawDistance(200, 'back', canvas);
        // drawDistance(150, 'backLeft45', canvas);
        // drawDistance(100, 'backLeft', canvas);
        // drawDistance(180, 'backRight45', canvas);
        // drawDistance(130, 'backRight', canvas);

    }
