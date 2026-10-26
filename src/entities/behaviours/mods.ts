import Phaser from 'phaser';
import { AFFIX_COLOURS, SWIFT_SPEED, VOLATILE, affixLabel, armourBar, splitSpec, vampireHeal, type Affix } from '../../logic/elites';
import { newWard, wardHit, type Ward } from '../../logic/ward';
import { floatText } from '../../systems/floatText';
import { playSfx } from '../../systems/sfx';
import { ringBurst } from '../../systems/skills/skillFx';
import type { Enemy } from '../Enemy';
import { detonate, telegraphBlast } from './blast';
import type { EnemyWorld } from './types';

const BAR_WIDTH = 14;
const SPLIT_SPREAD = 9;

/** Everything layered on top of a monster's own AI: its elite affix and any absorbing ward (armour or a priest's blessing). */
export class EnemyMods {
  ward: Ward | null = null;
  private wardExpiresAt = Infinity;
  private bar?: Phaser.GameObjects.Graphics;

  constructor(
    private readonly host: Enemy,
    readonly affix: Affix | undefined,
    private readonly world: EnemyWorld | undefined,
  ) {
    if (!affix) return;
    const colour = AFFIX_COLOURS[affix];
    host.setTag(`${affixLabel(affix)} ${host.def.name ?? host.def.id}`, `#${colour.toString(16).padStart(6, '0')}`);
    host.preFX?.addGlow(colour, 4, 0, false, 0.12, 8);
    if (affix === 'armoured') this.grantWard(armourBar(host.maxHp));
  }

  get speedMultiplier(): number {
    return this.affix === 'swift' ? SWIFT_SPEED : 1;
  }

  /** Runs a blow through the ward and returns the damage that gets through. */
  hit(amount: number): number {
    const result = wardHit(this.ward, amount);
    this.ward = result.ward;
    if (result.broke) {
      ringBurst(this.host.scene, this.host.x, this.host.y, 16, 0x9ab4ff, 300);
      floatText(this.host.scene, this.host.x, this.host.y - this.host.displayHeight / 2 - 6, 'Armour broken', '#9ab4ff', 8, 12, 700);
      playSfx(this.host.scene, 'shieldBreak', { volume: 0.7 });
    }
    return result.dealt;
  }

  /** A temporary ward from a priest; an existing one is kept. */
  grantWard(max: number, forMs = Infinity): void {
    if (this.ward) return;
    this.ward = newWard(max);
    this.wardExpiresAt = this.host.clock.now + forMs;
  }

  /** The monster just hurt the player for `dealt`. */
  onHitPlayer(dealt: number): void {
    if (this.affix === 'vampiric') this.host.heal(vampireHeal(dealt));
  }

  onDeath(): void {
    this.clearBar();
    if (this.affix === 'splitting') this.split();
    else if (this.affix === 'volatile') this.explodeLater();
  }

  update(): void {
    const { host } = this;
    if (this.ward && host.clock.now >= this.wardExpiresAt) this.ward = null;
    if (!this.ward) return this.clearBar();
    this.bar ??= host.scene.add.graphics().setDepth(7);
    const left = host.x - BAR_WIDTH / 2;
    const top = host.y + host.displayHeight / 2 + 1;
    this.bar
      .clear()
      .fillStyle(0x141c30, 0.9)
      .fillRect(left - 1, top - 1, BAR_WIDTH + 2, 4)
      .fillStyle(0x7aa8ff, 1)
      .fillRect(left, top, (BAR_WIDTH * this.ward.hp) / this.ward.max, 2);
  }

  destroy(): void {
    this.clearBar();
  }

  private clearBar(): void {
    this.bar?.destroy();
    this.bar = undefined;
  }

  private split(): void {
    const { host, world } = this;
    if (!world) return;
    const spec = splitSpec(host.maxHp);
    for (let i = 0; i < spec.count; i++) {
      const side = i === 0 ? -1 : 1;
      const spot = world.clearSpot({ x: host.x + side * SPLIT_SPREAD, y: host.y });
      world.spawn(host.def.id, host.level, spot.x, spot.y, { hp: spec.hp, scale: spec.scale });
    }
  }

  private explodeLater(): void {
    const { host, world } = this;
    if (!world) return;
    const { x, y, level, scene, target } = host;
    const base = Math.max(8, Math.round(host.def.baseDamage * VOLATILE.damageMultiplier));
    playSfx(scene, 'fuse');
    telegraphBlast(scene, x, y, VOLATILE.radius, VOLATILE.telegraphMs, () => detonate(scene, world, target, { x, y, radius: VOLATILE.radius, base, level }));
  }
}
