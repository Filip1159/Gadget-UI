import { Component, ElementRef, inject, HostListener, OnInit, ViewChild } from "@angular/core";
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
    private measureSchedule!: Subscription


    constructor() {
        this.socket.connect()
        this.socket.messages$.subscribe((msg: string) => {
            console.log('From ESP32:', msg);
            if (msg.startsWith('MEASURE')) {
                const [_, direction, distance] = msg.split(" ")
                drawDistance(parseInt(distance), direction, this.canvas.nativeElement)
            }
        });
        this.measureSchedule = interval(5000).subscribe(() => {
            this.socket.send('MEASURE')
        });
    }

    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>

    ngOnInit() {
        drawAll(this.canvas.nativeElement);
    }

    ngOnDestroy(): void {
        this.measureSchedule.unsubscribe();
    }
}
