import type Phaser from 'phaser';
import { MARKER_MS, markerProgress, markerPulse } from '../logic/spawnMarker';
import type { Point } from '../logic/geometry';
import { feel } from './feel';
import { playSfx } from './sfx';

const COLOUR = 0xffb04a;

interface Marker {
  at: Point;
  startedAt: number;
  durationMs: number;
  size: number;
  spread: number;
  arrive: (at: Point) => void;
}

/** Pulsing floor rings that telegraph each arrival; timed on the GameClock so pausing and hit-stops hold them. */
export class SpawnMarkers {
  private readonly markers: Marker[] = [];
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(2);
  }

  /** Arrivals still telegraphed. */
  get pending(): number {
    return this.markers.length;
  }

  /** Monsters those arrivals will bring. */
  get pendingMonsters(): number {
    return this.markers.reduce((sum, m) => sum + m.size, 0);
  }

  add(at: Point, now: number, arrive: (at: Point) => void, size = 1, spread = 0, durationMs = MARKER_MS): void {
    this.markers.push({ at, startedAt: now, durationMs, size, spread, arrive });
    playSfx(this.scene, 'spawnMark');
  }

  /** Redraws the rings and completes any that are due; `arrive` may call `add` again to relocate. */
  update(now: number): void {
    this.graphics.clear();
    for (const marker of [...this.markers]) {
      const progress = markerProgress(now, marker.startedAt, marker.durationMs);
      if (progress >= 1) {
        this.markers.splice(this.markers.indexOf(marker), 1);
        marker.arrive(marker.at);
        continue;
      }
      const { radius, alpha } = markerPulse(progress, feel.reduced, marker.spread);
      this.graphics.fillStyle(COLOUR, alpha * 0.35).fillCircle(marker.at.x, marker.at.y, radius);
      this.graphics.lineStyle(2, COLOUR, alpha).strokeCircle(marker.at.x, marker.at.y, radius);
    }
  }

  clear(): void {
    this.markers.length = 0;
    this.graphics.clear();
  }

  destroy(): void {
    this.clear();
    this.graphics.destroy();
  }
}
