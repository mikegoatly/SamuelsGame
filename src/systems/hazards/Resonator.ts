import Phaser from 'phaser';
import { MinesFrame, Tex } from '../../content/assetKeys';
import { MINES_TINT } from '../../content/minesTint';
import { newResonator, RESONATOR, stepResonator, struckBy, waveRadius, waveTouches, type ResonatorState } from '../../logic/hazard/resonator';
import { Cooldowns } from '../../logic/hazard/victims';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { ringBurst } from '../skills/skillFx';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { onStrike } from '../strikes';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';
import { enemyRadius, hazardTargets, hurtEnemy } from './victims';

const ENEMY_HIT = 0.28;
const BODY = 9;
const BOLT_REACH = 11;

/** A crystal that rings when you hit it, then sends out a shockwave that hurts monsters only (never you): lure them close, then strike it. Rests for a while afterwards. */
export class Resonator extends HazardBase {
  private readonly centre = { x: this.rect.x + this.rect.w / 2, y: this.rect.y + this.rect.h / 2 };
  private readonly image: Phaser.GameObjects.Image;
  private readonly hits = new Cooldowns<unknown>();
  private state: ResonatorState = newResonator();
  private struck = false;
  private readonly stopListening: () => void;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 0.64);
    this.image = world.scene.add.image(this.centre.x, this.centre.y, Tex.mines, MinesFrame.resonator).setScale(1.3).setDepth(4.2);
    this.stopListening = onStrike(world.scene, (x, y, reach) => {
      if (this.live && struckBy(this.centre, { x, y }, reach + BODY)) this.struck = true;
    });
    this.rest();
  }

  protected rest(): void {
    this.state = newResonator();
    this.hits.clear();
    this.g.clear();
    this.image.setAlpha(0.9).clearTint();
  }

  protected tick(now: number): void {
    const { scene, bolts } = this.world;
    const boltHit = (bolts?.getChildren() ?? []).some((b) => {
      const bolt = b as Phaser.Physics.Arcade.Sprite;
      return bolt.active && struckBy(this.centre, bolt, BOLT_REACH);
    });
    const step = stepResonator(this.state, now, boltHit || this.struck);
    this.struck = false;
    this.state = step.state;
    if (step.event === 'ring') playSfx(scene, 'chime');
    if (step.event === 'wave') {
      playSfx(scene, 'crystalHit');
      ringBurst(scene, this.centre.x, this.centre.y, RESONATOR.radius * 0.6, MINES_TINT.glowBlue, RESONATOR.waveMs);
      this.hits.clear();
      feel.shake(80, 0.002);
    }
    this.paint(now);
    if (this.state.phase === 'wave') this.hurtMonsters(now);
  }

  private hurtMonsters(now: number): void {
    const radius = waveRadius(now - (this.state.struckAt ?? now) - RESONATOR.ringMs);
    for (const enemy of hazardTargets(this.world)) {
      if (waveTouches(this.centre, radius, enemy, enemyRadius(enemy)) && this.hits.take(enemy, now, RESONATOR.cooldownMs)) hurtEnemy(enemy, ENEMY_HIT, this.centre.x, this.centre.y, 1.2);
    }
  }

  private paint(now: number): void {
    const g = this.g.clear();
    const { x, y } = this.centre;
    const since = now - (this.state.struckAt ?? now);
    const reduced = feel.reduced;
    switch (this.state.phase) {
      case 'ready':
        this.image.setAlpha(0.95).clearTint();
        g.lineStyle(1, MINES_TINT.glowBlue, reduced ? 0.4 : 0.25 + 0.2 * Math.sin(now / 400)).strokeCircle(x, y, 13);
        break;
      case 'ringing': {
        const p = since / RESONATOR.ringMs;
        this.image.setTint(0xffffff).setScale(1.3 + (reduced ? 0 : Math.sin(now / 30) * 0.06));
        for (let i = 0; i < 3; i++) g.lineStyle(2, MINES_TINT.glowBlue, 0.8 - i * 0.2).strokeCircle(x, y, 10 + ((p * 24 + i * 8) % 24));
        break;
      }
      case 'wave': {
        const radius = waveRadius(since - RESONATOR.ringMs);
        g.lineStyle(5, 0xffffff, 0.8).strokeCircle(x, y, radius);
        g.lineStyle(10, MINES_TINT.glowBlue, 0.3).strokeCircle(x, y, radius);
        break;
      }
      default:
        this.image.setAlpha(0.55).setScale(1.3).clearTint();
    }
  }

  override destroy(): void {
    this.stopListening();
    this.image.destroy();
    super.destroy();
  }
}

export const resonator = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Resonator(world, spec);
