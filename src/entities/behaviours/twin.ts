import Phaser from 'phaser';
import { damageToPlayer } from '../../logic/combat';
import { beamTouches } from '../../logic/beam';
import { rangedStance } from '../../logic/enemyAi';
import { playSfx } from '../../systems/sfx';
import type { Enemy } from '../Enemy';
import { blendWishes, directionTo, distanceTo, shootBolt } from './steer';
import type { BehaviourFactory } from './types';

const BEAM_COLOUR = 0x70e8ff;
const BEAM_HALF_WIDTH = 5;
const BEAM_TICK_MS = 550;
const BEAM_DAMAGE_SCALE = 0.8;
const NEAR = 100;
const FAR = 150;
const TOO_FAR = 135;
const TOO_CLOSE = 62;
const ORB_EVERY_MS = 3600;

const partners = new WeakMap<Enemy, Enemy>();
const leaders = new WeakSet<Enemy>();

/** Binds two freshly spawned mages: a beam joins them for as long as both live. */
export function linkTwins(a: Enemy, b: Enemy): void {
  partners.set(a, b);
  partners.set(b, a);
  leaders.add(a);
}

/** Two mages that keep apart with a crackling beam between them; walking through it hurts, and it drops when either one dies. */
export const twin: BehaviourFactory = (host) => {
  let nextOrb = host.clock.now + 1200 + Math.random() * 1500;
  let nextBeamHit = 0;
  let beam: Phaser.GameObjects.Graphics | undefined;
  const partner = (): Enemy | undefined => {
    const other = partners.get(host);
    return other?.alive ? other : undefined;
  };
  const clearBeam = (): void => {
    beam?.destroy();
    beam = undefined;
  };

  const drawBeam = (other: Enemy, now: number): void => {
    beam ??= host.scene.add.graphics().setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    const flicker = 0.7 + Math.sin(now / 45) * 0.3;
    beam.clear().lineStyle(5, BEAM_COLOUR, 0.25 * flicker).lineBetween(host.x, host.y, other.x, other.y).lineStyle(1.5, 0xffffff, flicker).lineBetween(host.x, host.y, other.x, other.y);
  };

  return {
    act(time) {
      const other = partner();
      const distance = distanceTo(host, host.target);
      const speed = host.def.speed * host.speedFactor;
      const stance = rangedStance(distance, NEAR, FAR);
      const toPlayer = directionTo(host, host.target);
      const wishes = [{ dir: toPlayer, weight: stance === 'approach' ? 1 : stance === 'retreat' ? -1.2 : 0 }];
      if (other) {
        const gap = distanceTo(host, other);
        const toPartner = directionTo(host, other);
        wishes.push({ dir: toPartner, weight: gap > TOO_FAR ? 1.4 : gap < TOO_CLOSE ? -1.4 : 0 });
      }
      const v = blendWishes(wishes, speed);
      host.setVelocity(v.x, v.y);
      host.setFlipX(host.target.x < host.x);
      if (host.armed && time >= nextOrb && distance < 230) {
        nextOrb = time + ORB_EVERY_MS;
        shootBolt(host, toPlayer, host.def.shotSpeed ?? 66, 280, { tint: BEAM_COLOUR, scale: 1.2 });
        playSfx(host.scene, 'enemyShot', { rate: 0.8 });
      }
    },
    update(time) {
      const other = partner();
      if (!other) return clearBeam();
      if (!leaders.has(host)) return;
      if (!host.armed || !other.armed) return clearBeam();
      drawBeam(other, time);
      const { target } = host;
      if (!target.dead && time >= nextBeamHit && beamTouches(target, host, other, BEAM_HALF_WIDTH)) {
        nextBeamHit = time + BEAM_TICK_MS;
        const damage = Math.max(1, Math.round(damageToPlayer(host.def.baseDamage, host.level, target.level) * BEAM_DAMAGE_SCALE));
        target.takeDamage(damage, (host.x + other.x) / 2, (host.y + other.y) / 2, 'hazard');
        playSfx(host.scene, 'beam');
      }
    },
    onDeath: clearBeam,
    destroy: clearBeam,
  };
};
