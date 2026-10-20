import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core'
import { Subscription, timer } from 'rxjs'

@Component({
    selector: 'longpress-button',
    templateUrl: './longpress-button.html',
})
export class LongPressButton implements OnDestroy {
    @Input() intervalMs = 500
    @Input() disabled = false
    @Input() label?: string

    /** Emitted immediately on press and then every `intervalMs` while held. */
    @Output() press = new EventEmitter<void>()
    /** Emitted once when a press that was started ends (release, cancel, leave, destroy). */
    @Output() release = new EventEmitter<void>()

    private subscription?: Subscription

    onPressStart(event?: PointerEvent): void {
        if (this.subscription) {
            return // already pressed; ignore a second pointer/duplicate start
        }
        event?.preventDefault()
        this.subscription = timer(0, this.intervalMs).subscribe(() => this.press.emit())
    }

    onPressEnd(): void {
        if (!this.subscription) {
            return
        }
        this.subscription.unsubscribe()
        this.subscription = undefined
        this.release.emit()
    }

    ngOnDestroy(): void {
        this.onPressEnd()
    }
}
