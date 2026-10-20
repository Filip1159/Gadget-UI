import { Component, ElementRef, inject, HostListener, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core";
import { drawAll, drawDistance } from "./drawing";
import { SocketService } from "../../../socket.service";
import { Subscription, interval } from 'rxjs';

@Component({
    selector: "robot-preview",
    templateUrl: "./robot-preview.html",
    styleUrls: ["./robot-preview.scss"]
})
export class RobotPreview implements OnInit {

    private socket = inject(SocketService)
    private cdr = inject(ChangeDetectorRef)
    public isMeasuring = false;
    private distances: Map<string, number> = new Map();

    constructor() {
        this.socket.connect()
        this.socket.messages$.subscribe((msg: string) => {
            console.log('From ESP32:', msg);
            if (msg.startsWith('MEASURE ')) {
                const [_, direction, distanceStr] = msg.split(" ")
                const distance = parseInt(distanceStr, 10);
                if (!direction || Number.isNaN(distance)) {
                    console.error('Malformed MEASURE message, ignoring:', msg);
                    return;
                }
                console.log('Setting distance:', direction, distance);
                this.distances.set(direction, distance);
                console.log('Map size:', this.distances.size);
                console.log('Calling redrawCanvas...');
                this.redrawCanvas();
            }
        });
    }

    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>

    ngOnInit() {
        console.log('ngOnInit - canvas element:', this.canvas?.nativeElement);
        drawAll(this.canvas.nativeElement);
    }

    toggleMeasurement() {
        this.isMeasuring = !this.isMeasuring;
        if (this.isMeasuring) {
            this.socket.send('MEASURE_START');
        } else {
            this.socket.send('MEASURE_STOP');
        }
    }

    private redrawCanvas() {
        if (!this.canvas?.nativeElement) {
            console.error('Canvas not available!');
            return;
        }

        console.log('Redrawing canvas with', this.distances.size, 'measurements');

        // Clear and redraw everything
        drawAll(this.canvas.nativeElement);

        // Redraw all stored distances
        this.distances.forEach((distance, direction) => {
            console.log('Drawing:', direction, distance);
            drawDistance(distance, direction, this.canvas.nativeElement);
        });

        console.log('Redraw complete');
    }
}
