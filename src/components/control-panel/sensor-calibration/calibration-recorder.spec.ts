import { CalibrationRecorder } from './calibration-recorder';

describe('CalibrationRecorder', () => {
  it('writes a header and one row per sweep, with OOR and missing sensors as empty cells', () => {
    const recorder = new CalibrationRecorder();
    recorder.add({ target: 'FRONT', distanceMm: 300, sample: 1, sweep: new Map([['FRONT', 298], ['BACK', null]]) });
    recorder.add({ target: 'ALL', distanceMm: 600, sample: 2, sweep: new Map([['FRONT', 0]]) });

    const [header, first, second, rest] = recorder.toCsv().split('\n');
    expect(header).toBe(
      'target,distance_mm,sample,FRONT,FRONT_LEFT_45,FRONT_LEFT,FRONT_RIGHT_45,FRONT_RIGHT,BACK,BACK_LEFT_45,BACK_LEFT,BACK_RIGHT_45,BACK_RIGHT',
    );
    expect(first).toBe('FRONT,300,1,298,,,,,,,,,');
    expect(second).toBe('ALL,600,2,0,,,,,,,,,');
    expect(rest).toBe('');
    expect(recorder.size).toBe(2);
  });

  it('clears', () => {
    const recorder = new CalibrationRecorder();
    recorder.add({ target: 'FRONT', distanceMm: 100, sample: 1, sweep: new Map() });
    recorder.clear();
    expect(recorder.size).toBe(0);
    expect(recorder.toCsv().trim().split('\n').length).toBe(1);
  });
});
