import { SENSOR_DIRECTIONS, SensorDirection, Sweep } from '../../../core/protocol';

/** The sensor that faces the wall during a run, or ALL when every sensor is valid for it. */
export type CalibrationTarget = SensorDirection | 'ALL';

export interface CalibrationRow {
  target: CalibrationTarget;
  distanceMm: number;
  sample: number;
  sweep: Sweep;
}

/**
 * Collects the sweeps of sensor characterisation runs and serialises them for
 * tools/analyze_sensors.py in the firmware repo (MAPPING.MD item 0.4). Framework-free.
 */
export class CalibrationRecorder {
  private rows: CalibrationRow[] = [];

  get size(): number {
    return this.rows.length;
  }

  add(row: CalibrationRow): void {
    this.rows.push(row);
  }

  clear(): void {
    this.rows = [];
  }

  /** `target,distance_mm,sample,<sensors...>`; an out-of-range or missing reading is an empty cell. */
  toCsv(): string {
    const lines = [['target', 'distance_mm', 'sample', ...SENSOR_DIRECTIONS].join(',')];
    for (const row of this.rows) {
      const readings = SENSOR_DIRECTIONS.map((sensor) => row.sweep.get(sensor) ?? '');
      lines.push([row.target, row.distanceMm, row.sample, ...readings].join(','));
    }
    return lines.join('\n') + '\n';
  }
}
