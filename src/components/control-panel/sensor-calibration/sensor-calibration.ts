import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CAL_DEFAULT_COUNT, CAL_MAX_COUNT, CAL_MAX_DISTANCE_MM } from '../../../core/config';
import { SENSOR_DIRECTIONS } from '../../../core/protocol';
import { downloadFile, timestampedName } from '../../../core/download';
import { NOT_OPEN, onSocketStatus, socketConnected } from '../../../core/socket/socket-status';
import { SocketService } from '../../../core/socket/socket.service';
import { CalibrationRecorder, CalibrationTarget } from './calibration-recorder';

/**
 * Sensor characterisation (firmware MAPPING.MD item 0.4): the robot ranges `count` sweeps in a row
 * while standing still in front of a wall, this panel records them and downloads a CSV for
 * tools/analyze_sensors.py. Run it at 100 / 300 / 600 / 1000 mm for each sensor.
 */
@Component({
  selector: 'sensor-calibration',
  imports: [FormsModule],
  templateUrl: './sensor-calibration.html',
  styleUrl: './sensor-calibration.scss',
})
export class SensorCalibration {
  private socket = inject(SocketService);
  private recorder = new CalibrationRecorder();
  private runTarget: CalibrationTarget = 'FRONT';

  readonly targets: CalibrationTarget[] = [...SENSOR_DIRECTIONS, 'ALL'];
  readonly maxDistance = CAL_MAX_DISTANCE_MM;
  readonly maxCount = CAL_MAX_COUNT;

  target = signal<CalibrationTarget>('FRONT');
  distanceMm = signal<number | null>(300);
  count = signal<number | null>(CAL_DEFAULT_COUNT);

  running = signal(false);
  done = signal(0);
  total = signal(0);
  recordedRows = signal(0);

  connected = socketConnected(this.socket);
  valid = computed(
    () => isInt(this.distanceMm(), CAL_MAX_DISTANCE_MM) && isInt(this.count(), CAL_MAX_COUNT),
  );
  canStart = computed(() => this.connected() && this.valid() && !this.running());

  constructor() {
    this.socket.calibration$.pipe(takeUntilDestroyed()).subscribe((message) => {
      if (message.type === 'calibration') {
        this.recorder.add({
          target: this.runTarget,
          distanceMm: message.distanceMm,
          sample: message.index,
          sweep: message.sweep,
        });
        this.recordedRows.set(this.recorder.size);
        this.done.set(message.index);
        this.total.set(message.total);
      } else {
        this.running.set(false);
      }
    });

    // The robot rejected the run (moving, bad numbers, ...): nothing will be streamed.
    this.socket.errors$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.running() && this.done() === 0) {
        this.running.set(false);
      }
    });

    onSocketStatus(this.socket, NOT_OPEN, () => this.running.set(false));
  }

  start(): void {
    const distanceMm = this.distanceMm();
    const count = this.count();
    if (!this.canStart() || distanceMm === null || count === null) {
      return;
    }
    this.runTarget = this.target();
    this.done.set(0);
    this.total.set(count);
    if (this.socket.send({ type: 'calibrate', distanceMm, count })) {
      this.running.set(true);
    }
  }

  stop(): void {
    this.socket.send({ type: 'calibrateStop' });
  }

  clear(): void {
    this.recorder.clear();
    this.recordedRows.set(0);
  }

  download(): void {
    downloadFile(timestampedName('sensor-calibration', 'csv'), this.recorder.toCsv(), 'text/csv');
  }
}

const isInt = (value: number | null, max: number): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max;
