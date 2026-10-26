import Phaser from 'phaser';
import { getEnemy } from '../../content/enemies';
import { rangedStance } from '../../logic/enemyAi';
import { playSfx } from '../../systems/sfx';
import { ringBurst, sparkBurst } from '../../systems/skills/skillFx';
import { directionTo, distanceTo, shootBolt, stand } from './steer';
import type { BehaviourFactory } from './types';

const RAISE_RANGE = 150;
const CAST_MS = 1000;
const RAISE_EVERY_MS = 3200;
const BOLT_EVERY_MS = 2800;
const MAX_RAISED = 4;
const NEAR = 105;
const FAR = 150;
const GREEN = 0x70d890;
const RAISED_TINT = 0x9af0b0;

/** Keeps its distance and raises each fallen monster once as a green-tinted ally; with no corpses nearby it lobs slow bolts. Kill it first. */
export const necromancer: BehaviourFactory = (host, world) => {
  let castUntil = 0;
  let readyAt = host.clock.now + 2000;
  let nextBolt = host.clock.now + 1500;
  let channelKey: number | null = null;
  let channelRing: Phaser.GameObjects.Arc | undefined;
  const aura = host.scene.add.circle(host.x, host.y + 4, 13, GREEN, 0.1).setStrokeStyle(1, GREEN, 0.8).setDepth(4);

  const raisedAlive = (): number => world.all().filter((e) => e.raised).length;

  const finishRaise = (): void => {
    channelRing?.destroy();
    channelRing = undefined;
    const key = channelKey;
    channelKey = null;
    const corpse = key === null ? null : world.graveyard.nearest(host, RAISE_RANGE + 40, host.clock.now);
    if (!corpse || corpse.key !== key) return;
    world.graveyard.raise(corpse.key);
    const spot = world.clearSpot(corpse);
    const risen = world.spawn(corpse.enemyId, Math.max(1, corpse.level - 1), spot.x, spot.y, { raised: true });
    risen.setTint(RAISED_TINT);
    sparkBurst(host.scene, corpse.x, corpse.y, GREEN, 12, 60);
    playSfx(host.scene, 'raise');
  };

  return {
    act(time) {
      if (channelKey !== null) {
        stand(host);
        if (time >= castUntil) finishRaise();
        return;
      }
      const distance = distanceTo(host, host.target);
      const stance = rangedStance(distance, NEAR, FAR);
      if (stance === 'approach') host.chase(time);
      else if (stance === 'retreat') {
        const d = directionTo(host, host.target);
        const speed = host.def.speed * host.speedFactor;
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else stand(host);
      host.setFlipX(host.target.x < host.x);
      if (!host.armed) return;
      const corpse = time >= readyAt && raisedAlive() < MAX_RAISED ? world.graveyard.nearest(host, RAISE_RANGE, time) : null;
      if (corpse && getEnemy(corpse.enemyId)) {
        channelKey = corpse.key;
        castUntil = time + CAST_MS;
        readyAt = castUntil + RAISE_EVERY_MS;
        channelRing = host.scene.add.circle(corpse.x, corpse.y, 12, GREEN, 0.18).setStrokeStyle(2, GREEN, 0.9).setDepth(3);
        ringBurst(host.scene, host.x, host.y, 16, GREEN, 400);
        playSfx(host.scene, 'raise', { rate: 0.8 });
      } else if (time >= nextBolt && distance < 230) {
        nextBolt = time + BOLT_EVERY_MS;
        shootBolt(host, directionTo(host, host.target), host.def.shotSpeed ?? 70, 260, { tint: GREEN });
        playSfx(host.scene, 'enemyShot', { rate: 0.7 });
      }
    },
    update() {
      aura.setPosition(host.x, host.y + 4).setScale(1 + Math.sin(host.clock.now / 180) * 0.12);
    },
    onDeath() {
      aura.destroy();
      channelRing?.destroy();
    },
    destroy() {
      aura.destroy();
      channelRing?.destroy();
    },
  };
};
