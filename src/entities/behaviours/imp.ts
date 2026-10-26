import Phaser from 'phaser';
import { Tex } from '../../content/assetKeys';
import { damageToPlayer } from '../../logic/combat';
import { FireTrail } from '../../logic/trail';
import { playSfx } from '../../systems/sfx';
import type { BehaviourFactory } from './types';

const TRAIL = { ttlMs: 2300, spacing: 9, max: 18 };
const FLAME_TINT = 0xff7a2a;
const BURN_RADIUS = 7;
const BURN_EVERY_MS = 550;
const CHECK_MS = 100;

/** Races at the player leaving short-lived flames behind; standing in them burns. The flames outlast the imp. */
export const imp: BehaviourFactory = (host) => {
  const { scene, clock, target, level } = host;
  const burnDamage = host.def.blastDamage ?? 5;
  const trail = new FireTrail(TRAIL);
  const sparks = new Set<Phaser.GameObjects.Image>();
  let nextBurnAt = 0;
  let wobble = Math.random() * Math.PI * 2;

  const light = (): void => {
    const now = host.clock.now;
    if (!trail.drop(host.x, host.y + 4, now)) return;
    const flame = host.scene.add.image(host.x, host.y + 4, Tex.puff).setTint(FLAME_TINT).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setScale(1.3);
    sparks.add(flame);
    host.scene.tweens.add({ targets: flame, alpha: 0.1, scale: 0.7, duration: TRAIL.ttlMs, onComplete: () => (sparks.delete(flame), flame.destroy()) });
  };

  const burn = (): void => {
    const now = clock.now;
    if (target.dead || target.actionsLocked || now < nextBurnAt || !trail.touching(target, BURN_RADIUS, now)) return;
    nextBurnAt = now + BURN_EVERY_MS;
    const spot = trail.live(now)[0];
    target.takeDamage(damageToPlayer(burnDamage, level, target.level), spot?.x ?? target.x, spot?.y ?? target.y, 'hazard');
    playSfx(scene, 'fuse', { rate: 0.8 });
  };

  const timer = scene.time.addEvent({
    delay: CHECK_MS,
    loop: true,
    callback: () => {
      burn();
      if (!host.alive && trail.live(clock.now).length === 0) timer.remove();
    },
  });

  return {
    act(time) {
      wobble += 0.05;
      host.chase(time, host.def.speed * (1 + Math.sin(wobble * 3) * 0.12));
      light();
    },
  };
};
