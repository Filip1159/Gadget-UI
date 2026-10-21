import { Command } from './types';

export const encodeCommand = (command: Command): string => {
  switch (command.type) {
    case 'drive': return command.direction;
    case 'speed': return `SPEED ${command.value}`;
    case 'pid': return `PID ${command.p} ${command.i} ${command.d}`;
    case 'measureStart': return 'MEASURE_START';
    case 'measureStop': return 'MEASURE_STOP';
    case 'calibrate': return `CAL ${command.distanceMm} ${command.count}`;
    case 'calibrateStop': return 'CAL_STOP';
    case 'poseReset': return 'POSE_RESET';
    case 'auth': return `AUTH ${command.token}`;
  }
};
