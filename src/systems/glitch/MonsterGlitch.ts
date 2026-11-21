import Phaser from 'phaser';
import type { Enemy } from '../../entities/Enemy';
import { GlitchMonster, pickTeleportDest } from '../../logic/glitchMonster';
import { feel } from '../feel';
import type { SkillWorld } from '../skills/types';

const BODY_REACH = 5;
/** Mid windup or dash: a scorpion-style charge must not be interrupted by a hop. */
const charging = (enemy: Enemy): boolean => {
  const phase = (enemy as unknown as { charge?: { phase: string } }).charge?.phase;
  return phase === 'windup' || phase === 'dash';
};
const FLICKER_MS = 70;

interface Entry {
  glitch: GlitchMonster;
  ghost?: Phaser.GameObjects.Image;
  jitter: { x: number; y: number };
  tint: number | null;
}

/** Applies the glitch look and the rare telegraphed teleport to every non-boss monster. Stats, attacks and species never change. */
export class MonsterGlitch {
  private readonly entries = new Map<Enemy, Entry>();
  private readonly flickers = new Map<Enemy, Phaser.GameObjects.Image>();

  constructor(
    private readonly world: SkillWorld,
    private readonly rng: () => number,
    private readonly requestBurst: (leadMs: number) => void,
  ) {}

  private entry(enemy: Enemy): Entry {
    let e = this.entries.get(enemy);
    if (!e) {
      e = { glitch: new GlitchMonster(this.rng), jitter: { x: 0, y: 0 }, tint: null };
      this.entries.set(enemy, e);
    }
    return e;
  }

  private clear(x: number, y: number): boolean {
    const { isSolid } = this.world;
    const r = BODY_REACH;
    return !isSolid(x, y) && !isSolid(x - r, y - r) && !isSolid(x + r, y - r) && !isSolid(x - r, y + r) && !isSolid(x + r, y + r);
  }

  update(): void {
    const { player, enemies, clock } = this.world;
    const now = clock.now;
    const reduced = feel.reduced;
    const worldOk = !feel.isLocked && !player.dead;
    for (const enemy of enemies.getChildren() as Enemy[]) {
      if (!enemy.active || !enemy.alive || enemy.def.boss) continue;
      const e = this.entry(enemy);
      this.tintOf(enemy, e, now, reduced);
      const allowed = worldOk && enemy.armed && enemy.targetable && !enemy.stunned && !charging(enemy);
      const event = e.glitch.step(now, { allowed, pick: () => pickTeleportDest(enemy, player, this.rng, (x, y) => this.clear(x, y)) });
      if (event?.type === 'telegraph') this.requestBurst(500);
      if (event?.type === 'teleport') this.teleport(enemy, event.dest);
      this.flicker(enemy, e, now);
      this.ghost(enemy, e, now, reduced);
    }
    for (const [enemy, e] of [...this.entries]) if (!enemy.active || !enemy.alive) this.forget(enemy, e);
  }

  /** Nudge sprites for the frame about to be drawn (called before render, undone right after) so physics never sees the jitter. */
  nudge(now: number): void {
    const reduced = feel.reduced;
    for (const [enemy, e] of this.entries) {
      if (!enemy.active || enemy.def.boss) continue;
      e.jitter = e.glitch.jitter(now, reduced);
      enemy.x += e.jitter.x;
      enemy.y += e.jitter.y;
    }
  }

  restore(): void {
    for (const [enemy, e] of this.entries) {
      if (!enemy.active) continue;
      enemy.x -= e.jitter.x;
      enemy.y -= e.jitter.y;
      e.jitter = { x: 0, y: 0 };
    }
  }

  private tintOf(enemy: Enemy, e: Entry, now: number, reduced: boolean): void {
    if (enemy.burning || enemy.stunned) {
      if (e.tint !== null) {
        e.tint = null;
        enemy.forcedTint = null;
        enemy.applyBaseTint();
      }
      return;
    }
    const tint = e.glitch.tint(now, reduced);
    if (tint === e.tint) return;
    e.tint = tint;
    enemy.forcedTint = tint;
    enemy.applyBaseTint();
  }

  private flicker(enemy: Enemy, e: Entry, now: number): void {
    const dest = e.glitch.destination;
    let image = this.flickers.get(enemy);
    if (!dest) {
      image?.destroy();
      this.flickers.delete(enemy);
      return;
    }
    if (!image) {
      image = this.world.scene.add.image(dest.x, dest.y, enemy.texture.key, enemy.frame.name).setDepth(4).setTint(0xff7ad9).setScale(enemy.scaleX, enemy.scaleY);
      this.flickers.set(enemy, image);
    }
    image.setPosition(dest.x, dest.y).setAlpha(feel.reduced || Math.floor(now / FLICKER_MS) % 2 === 0 ? 0.6 : 0.2);
  }

  private ghost(enemy: Enemy, e: Entry, now: number, reduced: boolean): void {
    if (!e.glitch.ghost(now, reduced)) {
      e.ghost?.setVisible(false);
      return;
    }
    e.ghost ??= this.world.scene.add.image(enemy.x, enemy.y, enemy.texture.key, enemy.frame.name).setDepth(4);
    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    const dx = body ? -Math.sign(body.velocity.x || 1) * 4 : -4;
    e.ghost
      .setTexture(enemy.texture.key, enemy.frame.name)
      .setPosition(enemy.x + dx, enemy.y)
      .setFlipX(enemy.flipX)
      .setScale(enemy.scaleX, enemy.scaleY)
      .setTint(0x6af0ff)
      .setAlpha(0.35)
      .setVisible(true);
  }

  private teleport(enemy: Enemy, dest: { x: number; y: number }): void {
    enemy.setPosition(dest.x, dest.y);
    (enemy.body as Phaser.Physics.Arcade.Body | null)?.reset(dest.x, dest.y);
    enemy.setVelocity(0, 0);
  }

  private forget(enemy: Enemy, e: Entry): void {
    e.ghost?.destroy();
    this.flickers.get(enemy)?.destroy();
    this.flickers.delete(enemy);
    this.entries.delete(enemy);
  }

  destroy(): void {
    for (const [enemy, e] of [...this.entries]) this.forget(enemy, e);
  }
}
