import Phaser from 'phaser';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import { Navigator, PathBudget } from '../logic/navigator';

const WOLF = 0x9ad8ff;

export interface AllyLook {
  frame: number;
  tint: number;
}

export const WOLF_LOOK: AllyLook = { frame: Frame.wolf, tint: WOLF };
const BODY_RADIUS = 5;
const budget = new PathBudget();

/** The summoned wolf's body: a ghostly sprite that walks (round walls) toward a goal. Not a physics body and not an enemy, so it never blocks doors or room clears. */
export class SpiritWolf extends Phaser.GameObjects.Image {
  nextBiteAt = 0;
  private readonly navigator: Navigator;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly until: number,
    private readonly isSolid: (x: number, y: number) => boolean,
    look: AllyLook = WOLF_LOOK,
  ) {
    super(scene, x, y, Tex.tiles, look.frame);
    scene.add.existing(this);
    this.setTint(look.tint).setAlpha(0.85).setDepth(6).setScale(1.1);
    this.navigator = new Navigator(isSolid, TILE_SIZE, Math.random, budget);
  }

  /** Walks toward the goal along the navigator's path, sliding along walls. */
  walkToward(now: number, goal: { x: number; y: number }, speed: number, deltaMs: number): void {
    const next = this.navigator.aim(now, this, goal, BODY_RADIUS, speed);
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) return;
    const step = Math.min(length, (speed * deltaMs) / 1000);
    const nx = this.x + (dx / length) * step;
    const ny = this.y + (dy / length) * step;
    if (!this.isSolid(nx, this.y)) this.x = nx;
    if (!this.isSolid(this.x, ny)) this.y = ny;
    this.setFlipX(dx < 0);
  }
}
