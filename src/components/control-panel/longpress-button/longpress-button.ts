import { Component, input, OnDestroy, output } from '@angular/core'
import { interval, Subscription } from 'rxjs'

@Component({
    selector: 'longpress-button',
    templateUrl: './longpress-button.html',
})
export class LongPressButton implements OnDestroy {
    intervalMs = input(500)
    disabled = input(false)
    label = input<string>()

    /** Emitted immediately on press and then every `intervalMs` while held. */
    press = output<void>()
    /** Emitted once when a press that was started ends (release, cancel, leave, destroy). */
    release = output<void>()

    private subscription?: Subscription

    onPressStart(event?: PointerEvent): void {
        if (this.subscription) {
            return // already pressed; ignore a second pointer/duplicate start
        }
        event?.preventDefault()
        this.press.emit() // immediately, not on the next tick, so even a very quick tap sends its command
        this.subscription = interval(this.intervalMs()).subscribe(() => this.press.emit())
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
