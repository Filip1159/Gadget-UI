import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LongPressButton } from './longpress-button';

@Component({
  imports: [LongPressButton],
  template:
    '<longpress-button (press)="presses = presses + 1" (release)="releases = releases + 1"></longpress-button>',
})
class Host {
  presses = 0;
  releases = 0;
}

describe('LongPressButton in a real component tree (guards the ngOnDestroy choice)', () => {
  it('releases when it is destroyed while held (the robot must be told to STOP)', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const button = fixture.debugElement.children[0].componentInstance as LongPressButton;
    button.onPressStart();
    expect(fixture.componentInstance.presses).toBe(1);
    fixture.destroy();
    expect(fixture.componentInstance.releases).toBe(1);
  });
});
