import { Injectable, signal } from '@angular/core';
import { Subject, filter, map } from 'rxjs';
import { Command, RobotMessage, encodeCommand, parseMessage } from './protocol';

export type SocketStatus = 'connecting' | 'open' | 'closed';

const DEFAULT_ROBOT_URL = 'ws://192.168.1.16:88';
const ROBOT_URL_STORAGE_KEY = 'robotUrl';
const MIN_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 10000;

@Injectable({ providedIn: 'root' })
export class SocketService {

  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectDelayMs = MIN_RECONNECT_MS;

  public messages$ = new Subject<string>();

  /** Parsed, validated frames from the robot; unrecognised frames are dropped. */
  public robot$ = this.messages$.pipe(
    map(msg => {
      const parsed = parseMessage(msg);
      if (!parsed) {
        console.error('Unrecognised or malformed message, ignoring:', msg);
      }
      return parsed;
    }),
    filter((m): m is RobotMessage => m !== undefined),
  );
  public status = signal<SocketStatus>('closed');

  /** Fires every time a connection is (re)established. */
  public opened$ = new Subject<void>();

  /** Robot address: `localStorage.robotUrl` overrides the default, e.g. `localStorage.robotUrl = 'ws://robot.local:88'`. */
  get url(): string {
    return localStorage.getItem(ROBOT_URL_STORAGE_KEY) ?? DEFAULT_ROBOT_URL;
  }

  /** Idempotent: does nothing if already connecting/open. Reconnects automatically after a drop. */
  connect() {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.status.set('connecting');

    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.onmessage = (event) => this.messages$.next(event.data);

    socket.onopen = () => {
      this.reconnectDelayMs = MIN_RECONNECT_MS;
      this.status.set('open');
      this.opened$.next();
    };

    socket.onerror = () => console.warn('WebSocket error');

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.status.set('closed');
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelayMs);
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_MS);
    };
  }

  /** Returns false (and drops the message) if the socket is not open. */
  send(command: Command): boolean {
    const message = encodeCommand(command);
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('Socket not open, dropping message:', message);
      return false;
    }
    this.socket.send(message);
    return true;
  }
}
