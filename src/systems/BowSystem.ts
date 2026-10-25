import Phaser from 'phaser';
import type { WeaponDef } from '../content/weapons';
import { fireProjectile } from '../entities/Projectile';
import { bowShot } from '../logic/bowDraw';
import { BOW_SPREAD, spreadAngles } from '../logic/weaponTwists';
import { feel } from './feel';
import { muzzleFlash } from './fx';
import type { MeleeOptions } from './MeleeSystem';
import { playSfx } from './sfx';

/** Looses arrows when the draw is released: speed and damage grow with the draw, a full draw pierces and (level 5) fans into three. */
export class BowSystem {
  constructor(private readonly o: MeleeOptions) {
    o.player.bowHandler = (x, y, aim, fraction, weapon) => this.release(x, y, aim, fraction, weapon);
  }

  private release(x: number, y: number, aim: number, fraction: number, weapon: WeaponDef): void {
    const shot = bowShot(fraction);
    const fan = weapon.activeTwist === 'spread' && shot.full;
    const angles = fan ? spreadAngles(aim, BOW_SPREAD.count, BOW_SPREAD.angle) : [aim];
    for (const angle of angles) {
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      fireProjectile(this.o.projectiles, x + direction.x * 10, y + direction.y * 10, direction, weapon, {
        damageScale: shot.damageScale * (fan && angle !== aim ? BOW_SPREAD.sideDamageScale : 1),
        speed: weapon.speed * shot.speedScale,
        pierce: shot.pierce,
      });
    }
    playSfx(this.o.scene, 'shoot', { rate: 1.3 - fraction * 0.5, volume: 0.8 + fraction * 0.6 });
    muzzleFlash(this.o.scene, x + Math.cos(aim) * 14, y + Math.sin(aim) * 14, aim, shot.full ? 0xffe27a : 0xc8a8ff);
    if (shot.full) feel.shake(50, 0.002);
  }
}
