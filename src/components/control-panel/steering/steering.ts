import { Component, effect, ElementRef, HostListener, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { SocketService } from '../../../socket.service'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faAngleUp, faArrowsToCircle, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { LongPressButton } from './../longpress-button/longpress-button'
import { Slider } from './../slider/slider'
import { Subject, Subscription, throttleTime } from 'rxjs'

const KEY_TO_DIRECTION = {
    'w': 'FORWARD',
    'q': 'FORWARD_LEFT',
    'e': 'FORWARD_RIGHT',
    'a': 'LEFT',
    's': 'BRAKE',
    'd': 'RIGHT',
    'x': 'BACKWARD',
    'z': 'BACKWARD_LEFT',
    'c': 'BACKWARD_RIGHT'
}

@Component({
    selector: 'steering',
    standalone: true,
    imports: [FontAwesomeModule, FormsModule, LongPressButton, Slider],
    templateUrl: './steering.html',
    styleUrl: './steering.scss',
})
export class Steering implements OnInit, OnDestroy {
    faAngleUp = faAngleUp
    faArrowsToCircle = faArrowsToCircle

    private socket = inject(SocketService)

    private keydown = new Subject<Event>();
    private sub!: Subscription;

    P = signal(0.15)
    I = signal(0.05)
    D = signal(0.00)

    ngOnInit(): void {
        this.sub = this.keydown
        .pipe(throttleTime(500))
        .subscribe(event => {
            const keyboardEvent = event as KeyboardEvent
            this.socket.send(KEY_TO_DIRECTION[keyboardEvent.key as keyof typeof KEY_TO_DIRECTION])
        });
    }

    move(msg: string): void {
        this.socket.send(msg)
    }

    setSpeed(msg: number): void {
        this.socket.send(`SPEED ${msg}`)
    }

    setPid() {
        this.socket.send(`PID ${this.P()} ${this.I()} ${this.D()}`)
    }

    // @HostListener('window:keydown', ['$event'])
    // handleKeyDown(event: Event) {
    //     this.keydown.next(event);
    // }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
