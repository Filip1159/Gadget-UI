import { Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { Steering } from './steering/steering'
import { RobotPreview } from "./robot-preview/robot-preview";
import { SensorCalibration } from "./sensor-calibration/sensor-calibration";

@Component({
    selector: 'control-panel',
    imports: [FontAwesomeModule, FormsModule, Steering, RobotPreview, SensorCalibration],
    templateUrl: './control-panel.html',
    styleUrl: './control-panel.scss',
})
export class ControlPanel {

}