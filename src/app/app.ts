import { Component, inject } from '@angular/core';
import { SocketService } from '../socket.service';
import { ControlPanel } from "./../components/control-panel/control-panel";
import { Header } from "./../components/header/header"

@Component({
  selector: 'app-root',
  imports: [Header, ControlPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected socket = inject(SocketService);

  constructor() {
    this.socket.connect();
  }
}
