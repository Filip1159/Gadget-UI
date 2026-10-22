import { Injectable, signal } from '@angular/core';
import { Subject, defer, filter, finalize, map, share } from 'rxjs';
import { DEFAULT_ROBOT_URL } from '../config';
import { SweepPairer, PosedSweep } from './sweep-pairing';
import {
  Command,
  Pose,
  RobotMessage,
  RobotState,
  Sweep,
  SweepPose,
  encodeCommand,
  parseMessage,
} from '../protocol';

export type SocketStatus = 'connecting' | 'open' | 'closed';

const ROBOT_URL_STORAGE_KEY = 'robotUrl';
const ROBOT_TOKEN_STORAGE_KEY = 'robotToken';
const MIN_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 10000;
const ERROR_VISIBLE_MS = 4000;

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectDelayMs = MIN_RECONNECT_MS;
  private errorTimer?: ReturnType<typeof setTimeout>;

  public messages$ = new Subject<string>();

  /** Parsed, validated frames from the robot; unrecognised frames are dropped. */
  public robot$ = this.messages$.pipe(
    map((msg) => {
      const parsed = parseMessage(msg);
      if (!parsed) {
        console.error('Unrecognised or malformed message, ignoring:', msg);
      }
      return parsed;
    }),
    filter((m): m is RobotMessage => m !== undefined),
    share(), // parse (and log bad frames) once, however many streams are derived from it
  );

  /** One complete sweep per frame. */
  public sweeps$ = this.robot$.pipe(
    filter((m): m is Extract<RobotMessage, { type: 'measure' }> => m.type === 'measure'),
    map((m) => m.sweep as Sweep),
  );

  /**
   * One complete sweep together with the pose at its start and end: each MEASURE frame is joined with the
   * SWEEP_POSE frame sent right before it (`pose` is null if none came). Prefer this over `sweeps$` for mapping.
   */
  public posedSweeps$ = defer(() => {
    const pairer = new SweepPairer(); // per subscriber, so subscribers never share pairing state
    const reconnect = this.opened$.subscribe(() => pairer.reset());
    return this.robot$.pipe(
      map((message) => pairer.push(message)),
      filter((posed): posed is PosedSweep => posed !== undefined),
      finalize(() => reconnect.unsubscribe()),
    );
  });

  /** Robot state, sent by the firmware right after (authenticated) connect. */
  public state$ = this.robot$.pipe(
    filter((m): m is Extract<RobotMessage, { type: 'state' }> => m.type === 'state'),
    map((m) => m.state as RobotState),
  );

  /** Frames of a sensor characterisation run (`CAL`): one per sweep, then `calibrationDone`. */
  public calibration$ = this.robot$.pipe(
    filter(
      (m): m is Extract<RobotMessage, { type: 'calibration' | 'calibrationDone' }> =>
        m.type === 'calibration' || m.type === 'calibrationDone',
    ),
  );

  /** Odometry pose, broadcast by the firmware every 200 ms (and once on connect). */
  public pose$ = this.robot$.pipe(
    filter((m): m is Extract<RobotMessage, { type: 'pose' }> => m.type === 'pose'),
    map((m) => m.pose as Pose),
  );

  /** Pose at the start and end of a sweep, emitted just before that sweep's `sweeps$` value. */
  public sweepPose$ = this.robot$.pipe(
    filter((m): m is Extract<RobotMessage, { type: 'sweepPose' }> => m.type === 'sweepPose'),
    map((m) => m.sweepPose as SweepPose),
  );

  /** Rejection reasons ("ERR <reason>") for commands the robot did not accept. */
  public errors$ = this.robot$.pipe(
    filter((m): m is Extract<RobotMessage, { type: 'error' }> => m.type === 'error'),
    map((m) => m.reason),
  );

  public status = signal<SocketStatus>('closed');

  /** Last "ERR <reason>" from the robot; clears itself after a few seconds. */
  public lastError = signal<string | null>(null);

  /** Fires every time a connection is (re)established. */
  public opened$ = new Subject<void>();

  constructor() {
    this.errors$.subscribe((reason) => {
      this.lastError.set(reason);
      clearTimeout(this.errorTimer);
      this.errorTimer = setTimeout(() => this.lastError.set(null), ERROR_VISIBLE_MS);
    });
  }

  /** Robot address: `localStorage.robotUrl` overrides the default, e.g. `localStorage.robotUrl = 'ws://gadget.local:88'`. */
  get url(): string {
    return localStorage.getItem(ROBOT_URL_STORAGE_KEY) ?? DEFAULT_ROBOT_URL;
  }

  /** Optional shared secret, only needed if the firmware defines WS_TOKEN. Sent as the first frame on (re)connect. */
  get token(): string {
    return localStorage.getItem(ROBOT_TOKEN_STORAGE_KEY) ?? '';
  }

  setToken(token: string): void {
    localStorage.setItem(ROBOT_TOKEN_STORAGE_KEY, token);
  }

  /** Saves a new robot address and reconnects to it right away. Returns false for an invalid URL. */
  setUrl(url: string): boolean {
    if (!/^wss?:\/\/\S+$/.test(url)) {
      return false;
    }
    localStorage.setItem(ROBOT_URL_STORAGE_KEY, url);
    clearTimeout(this.reconnectTimer);
    const old = this.socket;
    this.socket = undefined; // makes the old socket's onclose a no-op (no auto-reconnect to the old URL)
    old?.close();
    this.reconnectDelayMs = MIN_RECONNECT_MS;
    this.connect();
    return true;
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
      if (this.token) {
        socket.send(encodeCommand({ type: 'auth', token: this.token })); // must be the first frame
      }
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
