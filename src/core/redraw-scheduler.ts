/** Coalesces any number of `schedule()` calls into a single `draw()` on the next animation frame. */
export class RedrawScheduler {
  private scheduled = false;

  constructor(private readonly draw: () => void) {}

  schedule(): void {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.draw();
    });
  }
}
