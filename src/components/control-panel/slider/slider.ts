import { Component, model } from '@angular/core';
import { MAX_SPEED, SPEED_STEP } from '../../../core/config';

@Component({
  selector: 'slider',
  templateUrl: './slider.html',
  styleUrls: ['./slider.scss'],
})
export class Slider {
  /** Two-way bindable: [(value)]="..." or [value] + (valueChange). */
  value = model<number>(0);

  readonly max = MAX_SPEED;
  readonly step = SPEED_STEP;

  onInput(event: Event): void {
    this.value.set(Number((event.target as HTMLInputElement).value));
  }
}
