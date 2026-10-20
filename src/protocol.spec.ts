import { encodeCommand, parseMessage } from './protocol';

describe('parseMessage', () => {
  it('parses distances and OOR', () => {
    const message = parseMessage('MEASURE FRONT=412 FRONT_LEFT_45=OOR BACK=0');
    expect(message).toEqual({ type: 'measure', sweep: new Map([['FRONT', 412], ['FRONT_LEFT_45', null], ['BACK', 0]]) });
  });

  it('rejects the whole frame on an unknown sensor', () => {
    expect(parseMessage('MEASURE FRONT=412 SIDEWAYS=5')).toBeUndefined();
  });

  it('rejects malformed frames', () => {
    for (const bad of ['MEASURE', 'MEASURE FRONT', 'MEASURE FRONT=', 'MEASURE FRONT=abc', 'MEASURE FRONT=-5', 'MEASURE FRONT=1=2', 'HELLO FRONT=1', '']) {
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
    for (const bad of ['STATE', 'STATE SPEED=1000', 'STATE SPEED=x P=1 I=1 D=1 MEASURING=0', 'STATE SPEED=1 P=1 I=1 D=1 MEASURING=']) {
      expect(parseMessage(bad), bad).toBeUndefined();
    }
  });

  it('parses error frames', () => {
    expect(parseMessage('ERR unknown command')).toEqual({ type: 'error', reason: 'unknown command' });
  });
});

describe('encodeCommand', () => {
  it('encodes every command type', () => {
    expect(encodeCommand({ type: 'drive', direction: 'FORWARD_LEFT' })).toBe('FORWARD_LEFT');
    expect(encodeCommand({ type: 'speed', value: 800 })).toBe('SPEED 800');
    expect(encodeCommand({ type: 'pid', p: 0.15, i: 0.05, d: 0 })).toBe('PID 0.15 0.05 0');
    expect(encodeCommand({ type: 'measureStart' })).toBe('MEASURE_START');
    expect(encodeCommand({ type: 'measureStop' })).toBe('MEASURE_STOP');
    expect(encodeCommand({ type: 'auth', token: 'abc' })).toBe('AUTH abc');
  });
});
