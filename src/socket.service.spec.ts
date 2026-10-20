import { SocketService } from './socket.service';

class FakeWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen?: () => void; onclose?: () => void; onerror?: () => void; onmessage?: (e: { data: string }) => void;
  constructor(public url: string) { FakeWebSocket.instances.push(this); }
  send(message: string) { this.sent.push(message); }
  close() { /* the service ignores the old socket's onclose; tests trigger drop() themselves */ }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
  drop() { this.readyState = FakeWebSocket.CLOSED; this.onclose?.(); }
}

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    service = new SocketService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('drops messages instead of throwing while not open', () => {
    expect(service.send({ type: 'drive', direction: 'STOP' })).toBe(false);
    service.connect();
    expect(service.send({ type: 'drive', direction: 'STOP' })).toBe(false);
    expect(FakeWebSocket.instances[0].sent).toEqual([]);
  });

  it('sends encoded commands once open and reports status', () => {
    service.connect();
    expect(service.status()).toBe('connecting');
    FakeWebSocket.instances[0].open();
    expect(service.status()).toBe('open');
    expect(service.send({ type: 'speed', value: 500 })).toBe(true);
    expect(FakeWebSocket.instances[0].sent).toEqual(['SPEED 500']);
  });

  it('connect() is idempotent while connecting/open', () => {
    service.connect();
    service.connect();
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('reconnects with backoff after a drop', () => {
    service.connect();
    FakeWebSocket.instances[0].open();
    FakeWebSocket.instances[0].drop();
    expect(service.status()).toBe('closed');
    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances.length).toBe(2);
    FakeWebSocket.instances[1].drop(); // never opened: next delay doubles to 1000ms
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances.length).toBe(3);
  });

  it('setUrl validates, reconnects to the new address and does not auto-reconnect to the old one', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    service.connect();
    FakeWebSocket.instances[0].open();
    expect(service.setUrl('http://nope')).toBe(false);
    expect(service.setUrl('ws://robot.local:88')).toBe(true);
    expect(FakeWebSocket.instances.length).toBe(2);
    expect(FakeWebSocket.instances[1].url).toBe('ws://robot.local:88');
    FakeWebSocket.instances[0].drop(); // old socket closing must not trigger a reconnect
    vi.advanceTimersByTime(20000);
    expect(FakeWebSocket.instances.length).toBe(2);
  });

  it('sends AUTH as the very first frame when a token is configured', () => {
    const store: Record<string, string> = { robotToken: 'secret' };
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    service.connect();
    FakeWebSocket.instances[0].open();
    expect(FakeWebSocket.instances[0].sent).toEqual(['AUTH secret']);
  });

  it('does not send AUTH without a token', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    service.connect();
    FakeWebSocket.instances[0].open();
    expect(FakeWebSocket.instances[0].sent).toEqual([]);
  });

  it('exposes state and surfaces robot errors for a few seconds', () => {
    const states: unknown[] = [];
    service.state$.subscribe(s => states.push(s));
    service.connect();
    const ws = FakeWebSocket.instances[0];
    ws.onmessage?.({ data: 'STATE SPEED=500 P=0.1 I=0.2 D=0.3 MEASURING=0' });
    expect(states).toEqual([{ speed: 500, p: 0.1, i: 0.2, d: 0.3, measuring: false }]);
    ws.onmessage?.({ data: 'ERR invalid PID' });
    expect(service.lastError()).toBe('invalid PID');
    vi.advanceTimersByTime(4000);
    expect(service.lastError()).toBeNull();
  });

  it('emits only valid robot frames on robot$', () => {
    const received: unknown[] = [];
    service.robot$.subscribe(m => received.push(m));
    service.connect();
    FakeWebSocket.instances[0].onmessage?.({ data: 'garbage' });
    FakeWebSocket.instances[0].onmessage?.({ data: 'MEASURE FRONT=100' });
    expect(received.length).toBe(1);
  });
});
