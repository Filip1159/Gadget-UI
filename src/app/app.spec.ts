import { TestBed } from '@angular/core/testing';
import { App } from './app';

class FakeWebSocket {
  static OPEN = 1; static CONNECTING = 0; static CLOSING = 2; static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen?: () => void; onclose?: () => void; onerror?: () => void; onmessage?: (e: { data: string }) => void;
  constructor(public url: string) { FakeWebSocket.instances.push(this); }
  send(message: string) { this.sent.push(message); }
  close() { /* not needed */ }
  open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.(); }
  receive(data: string) { this.onmessage?.({ data }); }
}

// jsdom has no canvas; any 2D call is a no-op.
const fakeContext = new Proxy({}, { get: () => () => undefined, set: () => true });

describe('App (rendered with a fake robot)', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<App>>;
  let root: HTMLElement;

  beforeEach(async () => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fakeContext as unknown as CanvasRenderingContext2D);
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    fixture = TestBed.createComponent(App);
    root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const directionButtons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('longpress-button button'));

  it('shows the connection banner and disables the direction pad while offline', () => {
    expect(root.querySelector('.connection-banner')).not.toBeNull();
    expect(directionButtons().length).toBe(8);
    expect(directionButtons().every(b => b.disabled)).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('button[aria-label="Stop"]')?.disabled).toBe(false);
  });

  it('enables the pad once connected and initialises controls from the robot state frame', async () => {
    const ws = FakeWebSocket.instances[0];
    ws.open();
    ws.receive('STATE SPEED=1400 P=0.2000 I=0.1000 D=0.0100 MEASURING=1');
    await fixture.whenStable();

    expect(root.querySelector('.connection-banner')).toBeNull();
    expect(directionButtons().every(b => !b.disabled)).toBe(true);
    expect(root.querySelector<HTMLInputElement>('input.slider')?.value).toBe('1400');
    expect(root.querySelector<HTMLInputElement>('input[name="P"]')?.value).toBe('0.2');
    expect(root.textContent).toContain('Stop Measuring');
  });

  it('sends STOP when a direction button is released and shows robot errors', async () => {
    const ws = FakeWebSocket.instances[0];
    ws.open();
    await fixture.whenStable();

    const forward = directionButtons().find(b => b.getAttribute('aria-label') === 'Forward')!;
    forward.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    forward.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect(ws.sent).toEqual(['FORWARD', 'STOP']);

    ws.receive('ERR unknown command');
    await fixture.whenStable();
    expect(root.querySelector('.error-banner')?.textContent).toContain('unknown command');
  });
});
