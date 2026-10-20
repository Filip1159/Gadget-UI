import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { SocketService } from '../../../socket.service'
import { DriveDirection } from '../../../protocol'
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { faAngleUp, faArrowsToCircle, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { LongPressButton } from './../longpress-button/longpress-button'
import { Slider } from './../slider/slider'
import { Subject, Subscription, throttleTime } from 'rxjs'

const KEY_TO_DIRECTION: Record<string, DriveDirection> = {
    'w': 'FORWARD',
    'q': 'FORWARD_LEFT',
    'e': 'FORWARD_RIGHT',
    'a': 'LEFT',
    's': 'STOP',
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
    private speed$ = new Subject<number>();
    private speedSub!: Subscription;

    connected = computed(() => this.socket.status() === 'open')

    P = signal(0.15)
    I = signal(0.05)
    D = signal(0.00)

    ngOnInit(): void {
        // Slider fires an input event per step while dragging; send at most one per 100ms, keeping the final value.
        this.speedSub = this.speed$
            .pipe(throttleTime(100, undefined, { leading: true, trailing: true }))
            .subscribe(value => this.socket.send({ type: 'speed', value }))

        this.sub = this.keydown
        .pipe(throttleTime(500))
        .subscribe(event => {
            const keyboardEvent = event as KeyboardEvent
            const direction = KEY_TO_DIRECTION[keyboardEvent.key.toLowerCase()]
            if (direction) {
                this.socket.send({ type: 'drive', direction })
            }
        });
    }

    move(direction: DriveDirection): void {
        this.socket.send({ type: 'drive', direction })
    }

    setSpeed(speed: number): void {
        this.speed$.next(speed)
    }

    // ngModel gives null for an empty number input; never send that to the robot.
    pidValid = computed(() => [this.P(), this.I(), this.D()].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0))

    setPid() {
        if (!this.pidValid()) {
            return
        }
        this.socket.send({ type: 'pid', p: this.P(), i: this.I(), d: this.D() })
    }

    // @HostListener('window:keydown', ['$event'])
    // handleKeyDown(event: Event) {
    //     this.keydown.next(event);
    // }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
        this.speedSub.unsubscribe();
    }
}
