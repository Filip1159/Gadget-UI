import { Component, signal } from '@angular/core';
import { RobotComponent } from "./../components/robot/robot";

@Component({
  selector: 'app-root',
  imports: [RobotComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('exploring-robot');
}
