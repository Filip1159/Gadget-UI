import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { downloadFile, timestampedName } from '../../../core/download';
import { LogEntry, LogReplayer, parseNdjson, RawLogRecorder } from '../../../core/log/raw-log';
import { SocketService } from '../../../core/socket/socket.service';

/** Replay speeds: 0 means as fast as possible. */
export const REPLAY_SPEEDS = [1, 4, 0] as const;

/**
 * Records the POSE / SWEEP_POSE / MEASURE frames of a drive to a downloadable NDJSON file and replays a file back
 * into the app through the same entry point as live frames (`SocketService.messages$`), so the map and every other
 * panel see a replay exactly as they saw the drive (MAPPING.MD 2.5). Press "Clear map" first for a clean replay.
 */
@Component({
  selector: 'log-panel',
  templateUrl: './log-panel.html',
  styleUrl: './log-panel.scss',
})
export class LogPanel {
  private socket = inject(SocketService);
  private recorder = new RawLogRecorder();
  private replayer = new LogReplayer();
  private loaded: readonly LogEntry[] = [];

  readonly speeds = REPLAY_SPEEDS;
  readonly recording = signal(false);
  readonly recordedFrames = signal(0);
  readonly loadedFrames = signal(0);
  readonly speed = signal<number>(1);
  readonly replaying = signal(false);
  readonly message = signal<string | null>(null);
  readonly full = signal(false);
  readonly canPlay = computed(() => this.loadedFrames() > 0 && !this.recording());

  constructor() {
    this.socket.messages$.pipe(takeUntilDestroyed()).subscribe((frame) => {
      // Frames the panel itself replays are not recorded again.
      if (this.recording() && !this.replaying() && this.recorder.add(frame, Date.now())) {
        this.recordedFrames.set(this.recorder.size);
        if (this.recorder.full) {
          this.recording.set(false);
          this.full.set(true);
        }
      }
    });
    inject(DestroyRef).onDestroy(() => this.replayer.stop());
  }

  toggleRecording(): void {
    if (!this.recording()) {
      this.recorder.clear();
      this.recordedFrames.set(0);
      this.full.set(false);
      this.message.set(null);
    }
    this.recording.update((on) => !on);
  }

  download(): void {
    downloadFile(
      timestampedName('gadget-log', 'ndjson'),
      this.recorder.toNdjson(),
      'application/x-ndjson',
    );
  }

  async load(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // lets the same file be chosen again
    if (!file) {
      return;
    }
    this.stopReplay();
    const parsed = parseNdjson(await file.text());
    if ('error' in parsed) {
      this.loaded = [];
      this.loadedFrames.set(0);
      this.message.set(`${file.name}: ${parsed.error}`);
      return;
    }
    this.loaded = parsed.entries;
    this.loadedFrames.set(parsed.entries.length);
    this.message.set(null);
  }

  setSpeed(event: Event): void {
    this.speed.set(Number((event.target as HTMLSelectElement).value));
  }

  play(): void {
    this.replaying.set(true);
    this.replayer.start(
      this.loaded,
      (frame) => this.socket.messages$.next(frame),
      this.speed(),
      () => this.replaying.set(false),
    );
    // Speed 0 finishes inside start(); reflect that.
    this.replaying.set(this.replayer.playing);
  }

  stopReplay(): void {
    this.replayer.stop();
    this.replaying.set(false);
  }
}
