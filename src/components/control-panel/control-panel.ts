import { Component, effect, ElementRef, HostListener, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { SocketService } from '../../socket.service'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faAngleUp, faArrowsToCircle, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { Steering } from './steering/steering'
import { Subject, Subscription, throttleTime } from 'rxjs'
import { RobotPreview } from "./robot-preview/robot-preview";

const KEY_TO_DIRECTION = {
    'w': 'FORWARD',
    'q': 'FORWARD_LEFT',
    'e': 'FORWARD_RIGHT',
    'a': 'LEFT',
    's': 'BRAKE',
    'd': 'RIGHT',
    'x': 'BACKWARD',
    'z': 'BACKWARD_LEFT',
    'c': 'BACKWARD_RIGHT'
}

@Component({
    selector: 'control-panel',
    standalone: true,
    imports: [FontAwesomeModule, FormsModule, Steering, RobotPreview],
    templateUrl: './control-panel.html',
    styleUrl: './control-panel.scss',
})
export class ControlPanel {

}