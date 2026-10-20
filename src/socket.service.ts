import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {

  private socket?: WebSocket;
  public messages$ = new Subject<string>();

  connect() {
    this.socket = new WebSocket('ws://192.168.1.16:88');

    this.socket.onmessage = (event) => {
      console.log('MSG:', event.data);
      this.messages$.next(event.data);
    };

    this.socket.onopen = () => console.log('Connected');
    this.socket.onclose = () => console.log('Disconnected');
  }

  /** Returns false (and drops the message) if the socket is not open. */
  send(message: string): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('Socket not open, dropping message:', message);
      return false;
    }
    this.socket.send(message);
    return true;
  }
}
