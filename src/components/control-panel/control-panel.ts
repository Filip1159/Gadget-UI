import { Component, signal } from '@angular/core';
import { Steering } from './steering/steering';
import { RobotPreview } from './robot-preview/robot-preview';
import { SensorCalibration } from './sensor-calibration/sensor-calibration';
import { PoseDisplay } from './pose-display/pose-display';
import { MapPanel } from './map-panel/map-panel';
import { LogPanel } from './log-panel/log-panel';

type TabId = 'drive' | 'calibration';

@Component({
  selector: 'control-panel',
  imports: [Steering, RobotPreview, SensorCalibration, PoseDisplay, MapPanel, LogPanel],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
})
export class ControlPanel {
  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'drive', label: 'Drive' },
    { id: 'calibration', label: 'Calibration' },
  ];
  readonly tab = signal<TabId>('drive');

  /** Left / Right / Home / End move between tabs, as in the WAI-ARIA tabs pattern. */
  onTabKey(event: KeyboardEvent): void {
    const index = this.tabs.findIndex((t) => t.id === this.tab());
    const last = this.tabs.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.tab.set(this.tabs[next].id);
    document.getElementById('tab-' + this.tabs[next].id)?.focus();
  }
}
