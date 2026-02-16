import { Component, Input, Output, EventEmitter } from '@angular/core'

@Component({
    selector: 'slider',
    standalone: true,
    templateUrl: './slider.html',
    styleUrls: ['./slider.scss'],
})
export class Slider {
    @Input() value = 0

    @Output() valueChange = new EventEmitter<number>()

    onInput(event: Event): void {
        const newValue = Number((event.target as HTMLInputElement).value)
        this.value = newValue
        this.valueChange.emit(newValue)
    }
}
