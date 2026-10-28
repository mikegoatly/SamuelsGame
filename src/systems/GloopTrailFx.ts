import Phaser from 'phaser';
import { GloopTrail, trailAlpha, TRAIL } from '../logic/gloopTrail';
import type { SkillWorld } from './skills/types';

const GREEN = 0x7adf4a;

/** Gloop's cosmetic trail: a few small green blobs that fade behind him while he walks. A fixed ring of reused circles, so it stays cheap; it never touches monsters. */
export class GloopTrailFx {
  private readonly trail = new GloopTrail();
  private readonly blobs: { shape: Phaser.GameObjects.Arc; bornAt: number }[];
  private next = 0;

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    this.blobs = Array.from({ length: TRAIL.max }, () => ({ shape: scene.add.circle(0, 0, TRAIL.radius, GREEN, 1).setDepth(2).setVisible(false), bornAt: -Infinity }));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private update(): void {
    const { player, clock } = this.world;
    const now = clock.now;
    if (!player.dead) {
      const drop = player.isDashing || player.body!.velocity.lengthSq() > 100 ? this.trail.step(player.x, player.y + 5, now) : (this.trail.reset(), null);
      if (drop) {
        const slot = this.blobs[this.next++ % this.blobs.length]!;
        slot.bornAt = now;
        slot.shape.setPosition(drop.x, drop.y).setScale(player.scaleX).setVisible(true);
      }
    }
    for (const slot of this.blobs) {
      if (!slot.shape.visible) continue;
      const alpha = trailAlpha(now - slot.bornAt);
      slot.shape.setAlpha(alpha).setVisible(alpha > 0);
    }
  }
}
