import { Component, signal } from '@angular/core';
import { RobotComponent } from "./../components/robot/robot";
import { Steering } from "./../components/steering/steering";

@Component({
  selector: 'app-root',
  imports: [RobotComponent, Steering],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('exploring-robot');
}
