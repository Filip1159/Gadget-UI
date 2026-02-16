import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {

  private socket!: WebSocket;
  public messages$ = new Subject<string>();

  connect() {
    this.socket = new WebSocket('ws://10.102.193.162:88');

    this.socket.onmessage = (event) => {
      console.log('MSG:', event.data);
      this.messages$.next(event.data);
    };

    this.socket.onopen = () => console.log('Connected');
    this.socket.onclose = () => console.log('Disconnected');
  }

  send(message: string) {
    this.socket.send(message)
  }
}
