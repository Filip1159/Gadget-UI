import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RawLogRecorder } from '../../../core/log/raw-log';
import { SocketService } from '../../../core/socket/socket.service';
import { LogPanel } from './log-panel';

describe('LogPanel', () => {
  let messages$: Subject<string>;
  let panel: LogPanel;

  const fileEvent = (content: string, name = 'drive.ndjson') =>
    ({ target: { files: [{ name, text: async () => content }], value: 'x' } }) as unknown as Event;

  beforeEach(() => {
    messages$ = new Subject<string>();
    TestBed.configureTestingModule({
      providers: [{ provide: SocketService, useValue: { messages$, status: signal('closed') } }],
    });
    panel = TestBed.runInInjectionContext(() => new LogPanel());
  });

  it('records only the logged frame kinds while recording', () => {
    messages$.next('POSE X=0 Y=0 TH=0 T=1 Q=0');
    expect(panel.recordedFrames()).toBe(0);
    panel.toggleRecording();
    messages$.next('POSE X=0 Y=0 TH=0 T=1 Q=0');
    messages$.next('STATE SPEED=1 P=1 I=1 D=1 MEASURING=0');
    messages$.next('MEASURE FRONT=400');
    expect(panel.recordedFrames()).toBe(2);
    panel.toggleRecording();
    messages$.next('POSE X=1 Y=0 TH=0 T=2 Q=0');
    expect(panel.recordedFrames()).toBe(2);
  });

  it('replays a loaded log into messages$ as if the robot had sent it', async () => {
    const rec = new RawLogRecorder();
    rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', 0);
    rec.add('MEASURE FRONT=400', 10);
    await panel.load(fileEvent(rec.toNdjson()));
    expect(panel.loadedFrames()).toBe(2);

    const seen: string[] = [];
    messages$.subscribe((f) => seen.push(f));
    panel.speed.set(0);
    panel.play();
    expect(seen).toEqual(['POSE X=0 Y=0 TH=0 T=1 Q=0', 'MEASURE FRONT=400']);
    expect(panel.replaying()).toBe(false);
  });

  it('does not record its own replay', async () => {
    const rec = new RawLogRecorder();
    rec.add('POSE X=0 Y=0 TH=0 T=1 Q=0', 0);
    await panel.load(fileEvent(rec.toNdjson()));
    panel.recording.set(true);
    panel.speed.set(0);
    panel.play();
    expect(panel.recordedFrames()).toBe(0);
  });

  it('refuses a bad file, says why and keeps nothing loaded', async () => {
    await panel.load(fileEvent('garbage', 'bad.ndjson'));
    expect(panel.loadedFrames()).toBe(0);
    expect(panel.message()).toBe('bad.ndjson: Not a Gadget log (line 1)');
    expect(panel.canPlay()).toBe(false);
  });
});
