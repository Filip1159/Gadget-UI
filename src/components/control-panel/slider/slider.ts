import { Component, model } from '@angular/core'

@Component({
    selector: 'slider',
    templateUrl: './slider.html',
    styleUrls: ['./slider.scss'],
})
export class Slider {
    /** Two-way bindable: [(value)]="..." or [value] + (valueChange). */
    value = model<number>(0)

    onInput(event: Event): void {
        this.value.set(Number((event.target as HTMLInputElement).value))
    }
}
