import { Component, ElementRef, inject, HostListener, OnInit, ViewChild } from "@angular/core";
import { drawAll, drawDistance } from "./drawing";
import { SocketService } from "../../../socket.service";

@Component({
    selector: "robot-preview",
    templateUrl: "./robot-preview.html",
    styleUrls: ["./robot-preview.scss"]
})
export class RobotPreview implements OnInit {

     private socket = inject(SocketService)


    constructor() {
        this.socket.connect();

        this.socket.messages$.subscribe((msg: string) => {
            console.log('From ESP32:', msg);
            const [direction, distance] = msg.split(" ")
            drawDistance(parseInt(distance), direction, this.canvas.nativeElement)
        });
    }

    @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>

    ngOnInit() {
        drawAll(this.canvas.nativeElement);
    }
}