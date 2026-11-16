import { encodeCommand, parseMessage } from './index';

describe('parseMessage', () => {
  it('parses distances and OOR', () => {
    const message = parseMessage('MEASURE FRONT=412 FRONT_LEFT_45=OOR BACK=0');
    expect(message).toEqual({
      type: 'measure',
      sweep: new Map([
        ['FRONT', 412],
        ['FRONT_LEFT_45', null],
        ['BACK', 0],
      ]),
    });
  });

  it('rejects the whole frame on an unknown sensor', () => {
    expect(parseMessage('MEASURE FRONT=412 SIDEWAYS=5')).toBeUndefined();
  });

  it('rejects malformed frames', () => {
    for (const bad of [
      'MEASURE',
      'MEASURE FRONT',
      'MEASURE FRONT=',
      'MEASURE FRONT=abc',
      'MEASURE FRONT=-5',
      'MEASURE FRONT=1=2',
      'HELLO FRONT=1',
      '',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });
});

describe('parseMessage STATE / ERR', () => {
  it('parses a state frame', () => {
    expect(parseMessage('STATE SPEED=1000 P=0.1500 I=0.0500 D=0.0000 MEASURING=1')).toEqual({
      type: 'state',
      state: { speed: 1000, p: 0.15, i: 0.05, d: 0, measuring: true },
    });
  });

  it('rejects incomplete or non-numeric state frames', () => {
    for (const bad of [
      'STATE',
      'STATE SPEED=1000',
      'STATE SPEED=x P=1 I=1 D=1 MEASURING=0',
      'STATE SPEED=1 P=1 I=1 D=1 MEASURING=',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });

  it('parses error frames', () => {
    expect(parseMessage('ERR unknown command')).toEqual({
      type: 'error',
      reason: 'unknown command',
    });
  });
});

describe('parseMessage POSE', () => {
  it('parses a pose frame', () => {
    expect(parseMessage('POSE X=1106 Y=-43 TH=-49 T=123456 Q=0')).toEqual({
      type: 'pose',
      pose: {
        xMm: 1106,
        yMm: -43,
        theta: -0.049,
        tMs: 123456,
        questionable: false,
        relocated: false,
      },
    });
  });

  it('parses the quality and relocation flags', () => {
    expect(parseMessage('POSE X=0 Y=0 TH=0 T=1 Q=1 RELOC=1')).toEqual({
      type: 'pose',
      pose: { xMm: 0, yMm: 0, theta: 0, tMs: 1, questionable: true, relocated: true },
    });
  });

  it('rejects malformed pose frames', () => {
    for (const bad of [
      'POSE',
      'POSE X=1 Y=2 TH=3 T=4',
      'POSE X=1 Y=2 TH=3 Q=0',
      'POSE X=a Y=2 TH=3 T=4 Q=0',
      'POSE X=1.5 Y=2 TH=3 T=4 Q=0',
      'POSE X=1 Y=2 TH=3 T=-4 Q=0',
      'POSE X=1 Y=2 TH=3 T=4 Q=2',
      'POSE X=1 X=2 Y=2 TH=3 T=4 Q=0',
      'POSE X=1 Y=2 TH=3 T=4 Q=0 RELOC=2',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });
});

describe('parseMessage SWEEP_POSE', () => {
  it('parses start and end poses', () => {
    expect(
      parseMessage('SWEEP_POSE T0=1000 X0=10 Y0=-2 TH0=5 T1=1390 X1=30 Y1=-3 TH1=-12'),
    ).toEqual({
      type: 'sweepPose',
      sweepPose: {
        start: { xMm: 10, yMm: -2, theta: 0.005, tMs: 1000 },
        end: { xMm: 30, yMm: -3, theta: -0.012, tMs: 1390 },
      },
    });
  });

  it('rejects malformed or incomplete frames', () => {
    for (const bad of [
      'SWEEP_POSE',
      'SWEEP_POSE T0=1 X0=1 Y0=1 TH0=1',
      'SWEEP_POSE T0=1 X0=1 Y0=1 TH0=1 T1=2 X1=2 Y1=2',
      'SWEEP_POSE T0=1 X0=1 Y0=1 TH0=1 T1=2 X1=2 Y1=2 TH1=x',
      'SWEEP_POSE T0=-1 X0=1 Y0=1 TH0=1 T1=2 X1=2 Y1=2 TH1=2',
      'SWEEP_POSE T0=1 X0=1 Y0=1 TH0=1 T1=2 X1=2 Y1=2 TH1=2 Q=0',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });
});

describe('parseMessage CAL / CAL_DONE', () => {
  it('parses a calibration sweep', () => {
    expect(parseMessage('CAL 300 5/100 FRONT=298 BACK=OOR')).toEqual({
      type: 'calibration',
      distanceMm: 300,
      index: 5,
      total: 100,
      sweep: new Map([
        ['FRONT', 298],
        ['BACK', null],
      ]),
    });
  });

  it('parses the done frame', () => {
    expect(parseMessage('CAL_DONE 300 100')).toEqual({
      type: 'calibrationDone',
      distanceMm: 300,
      done: 100,
    });
  });

  it('rejects malformed calibration frames', () => {
    for (const bad of [
      'CAL',
      'CAL 300',
      'CAL 300 5/100',
      'CAL 300 5 FRONT=1',
      'CAL x 5/100 FRONT=1',
      'CAL 300 5/100 SIDEWAYS=1',
      'CAL_DONE',
      'CAL_DONE 300',
      'CAL_DONE 300 x',
      'CAL_DONE 300 1 2',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });
});

describe('parseMessage IMU_ORIENT', () => {
  it('parses a successful check', () => {
    expect(parseMessage('IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=2 RATE=85')).toEqual({
      type: 'imuOrient',
      result: { verdict: 'ok', up: '+Z', yaw: '+Z', tiltDeg: 2, rateDps: 85 },
    });
    expect(parseMessage('IMU_ORIENT RESULT=ok UP=-Z YAW=-Z TILT=0 RATE=120')).toMatchObject({
      result: { up: '-Z', yaw: '-Z' },
    });
  });

  it('maps unknown axes (?) to null', () => {
    expect(parseMessage('IMU_ORIENT RESULT=no_data UP=? YAW=? TILT=0 RATE=0')).toEqual({
      type: 'imuOrient',
      result: { verdict: 'no_data', up: null, yaw: null, tiltDeg: 0, rateDps: 0 },
    });
    expect(
      parseMessage('IMU_ORIENT RESULT=inconsistent UP=+Z YAW=-Z TILT=1 RATE=90'),
    ).toMatchObject({ result: { verdict: 'inconsistent', up: '+Z', yaw: '-Z' } });
  });

  it('accepts every verdict the firmware can send', () => {
    for (const verdict of [
      'ok',
      'no_data',
      'moving',
      'no_gravity',
      'tilted',
      'no_spin',
      'inconsistent',
      'aborted',
    ]) {
      const frame = `IMU_ORIENT RESULT=${verdict} UP=? YAW=? TILT=0 RATE=0`;
      expect(parseMessage(frame), frame).toMatchObject({ result: { verdict } });
    }
  });

  it('rejects malformed frames', () => {
    for (const bad of [
      'IMU_ORIENT',
      'IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=2',
      'IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=2 RATE=85 X=1',
      'IMU_ORIENT RESULT=fine UP=+Z YAW=+Z TILT=2 RATE=85',
      'IMU_ORIENT RESULT=ok UP=Z YAW=+Z TILT=2 RATE=85',
      'IMU_ORIENT RESULT=ok UP=+W YAW=+Z TILT=2 RATE=85',
      'IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=x RATE=85',
      'IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=-2 RATE=85',
      'IMU_ORIENT RESULT=ok UP=+Z YAW=+Z TILT=2 RATE=',
      'IMU_ORIENT RESULT=ok RESULT=ok UP=+Z YAW=+Z TILT=2',
    ]) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });
});

describe('encodeCommand', () => {
  it('encodes every command type', () => {
    expect(encodeCommand({ type: 'drive', direction: 'FORWARD_LEFT' })).toBe('FORWARD_LEFT');
    expect(encodeCommand({ type: 'speed', value: 800 })).toBe('SPEED 800');
    expect(encodeCommand({ type: 'pid', p: 0.15, i: 0.05, d: 0 })).toBe('PID 0.15 0.05 0');
    expect(encodeCommand({ type: 'measureStart' })).toBe('MEASURE_START');
    expect(encodeCommand({ type: 'measureStop' })).toBe('MEASURE_STOP');
    expect(encodeCommand({ type: 'calibrate', distanceMm: 300, count: 100 })).toBe('CAL 300 100');
    expect(encodeCommand({ type: 'calibrateStop' })).toBe('CAL_STOP');
    expect(encodeCommand({ type: 'poseReset' })).toBe('POSE_RESET');
    expect(encodeCommand({ type: 'imuCheck' })).toBe('IMU_CHECK');
    expect(encodeCommand({ type: 'imuCheckStop' })).toBe('IMU_CHECK_STOP');
    expect(encodeCommand({ type: 'auth', token: 'abc' })).toBe('AUTH abc');
  });
});

describe('parseMessage STATE duplicates', () => {
  it('rejects a STATE frame that repeats a key', () => {
    expect(parseMessage('STATE SPEED=1 SPEED=2 P=1 I=1 D=1 MEASURING=0')).toBeUndefined();
  });
});
