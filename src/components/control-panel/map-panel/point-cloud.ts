import { WorldPoint } from './map-view';

export const CLOUD_MAX_POINTS = 20000;
/** Points fade from full brightness to the faintest over this long. */
export const CLOUD_FADE_MS = 60_000;

export type CloudPoint = WorldPoint & { addedAt: number };

/** The obstacle points seen so far, each stamped with the time it was added so the renderer can colour by age. */
export class PointCloud {
  private points: CloudPoint[] = [];

  get all(): readonly CloudPoint[] {
    return this.points;
  }

  add(points: readonly WorldPoint[], now: number): void {
    for (const p of points) {
      this.points.push({ x: p.x, y: p.y, addedAt: now });
    }
    if (this.points.length > CLOUD_MAX_POINTS) {
      this.points.splice(0, this.points.length - CLOUD_MAX_POINTS);
    }
  }

  clear(): void {
    this.points = [];
  }
}

/** 1 for a point just added, falling linearly to 0 after CLOUD_FADE_MS. */
export const freshness = (addedAt: number, now: number): number =>
  Math.max(0, 1 - (now - addedAt) / CLOUD_FADE_MS);
