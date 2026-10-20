import { Component, ElementRef, effect, inject, OnInit, signal, ViewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { interval } from "rxjs";
import { drawAll, drawDistance } from "./drawing";
import { Command, Sweep } from "../../../protocol";
import { SocketService } from "../../../socket.service";

const STALE_AFTER_MS = 3000;

@Component({
    selector: "robot-preview",
    templateUrl: "./robot-preview.html",
    styleUrls: ["./robot-preview.scss"]
})
export class RobotPreview implements OnInit {

    private socket = inject(SocketService)
    public isMeasuring = signal(false);
    // null = out of range (no obstacle detected)
    private distances: Sweep = new Map();
    private lastSweepAt = 0;
    private redrawScheduled = false;

    constructor() {
        this.socket.robot$.pipe(takeUntilDestroyed()).subscribe(message => {
            // A frame is one atomic sweep: replace the whole picture.
            this.distances = message.sweep;
            this.lastSweepAt = Date.now();
            this.scheduleRedraw();
        });

        this.socket.opened$.pipe(takeUntilDestroyed()).subscribe(() => {
            // The robot keeps its continuous-measurement flag across page reloads/reconnects,
            // so bring both sides back to a known state.
            this.isMeasuring.set(false);
            this.socket.send({ type: 'measureStop' });
        });

        // Drop readings that stopped arriving instead of showing them as current.
        interval(500).pipe(takeUntilDestroyed()).subscribe(() => {
            if (this.distances.size > 0 && Date.now() - this.lastSweepAt > STALE_AFTER_MS) {
                this.clearDistances();
            }
        });

        effect(() => {
            if (this.socket.status() === 'closed') {
                this.isMeasuring.set(false);
                this.clearDistances();
            }
        });
    }

    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>

    ngOnInit() {
        const canvas = this.canvas.nativeElement;
        // Back the canvas with device pixels but keep drawing in 600x600 CSS-pixel coordinates.
        const dpr = window.devicePixelRatio || 1;
        const size = canvas.width;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${canvas.height}px`;
        canvas.width = size * dpr;
        canvas.height = canvas.height * dpr;
        canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawAll(canvas);
    }

    toggleMeasurement() {
        const command: Command = { type: this.isMeasuring() ? 'measureStop' : 'measureStart' };
        if (!this.socket.send(command)) {
            return;
        }
        this.isMeasuring.update(v => !v);
        if (!this.isMeasuring()) {
            this.clearDistances();
        }
    }

    private clearDistances() {
        this.distances.clear();
        this.scheduleRedraw();
    }

    /** Coalesces the 10 frames of a sweep into a single repaint. */
    private scheduleRedraw() {
        if (this.redrawScheduled) {
            return;
        }
        this.redrawScheduled = true;
        requestAnimationFrame(() => {
            this.redrawScheduled = false;
            this.redrawCanvas();
        });
    }

    private redrawCanvas() {
        const canvas = this.canvas?.nativeElement;
        if (!canvas) {
            return;
        }
        drawAll(canvas);
        this.distances.forEach((distance, direction) => drawDistance(distance, direction, canvas));
    }
}
