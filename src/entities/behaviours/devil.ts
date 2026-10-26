import { Tex } from '../../content/assetKeys';
import { bodyClear } from '../../logic/lineOfSight';
import { bendVelocity, pullToward } from '../../logic/whirl';
import { playSfx } from '../../systems/sfx';
import type { Projectile } from '../Projectile';
import type { BehaviourFactory } from './types';

const RADIUS = 58;
const PULL = 20;
const BEND = 3.2;
const SAND = 0xd8c090;
const PLAYER_RADIUS = 6;

/** A drifting whirlwind: it tugs the player gently toward its eye and swings passing bolts off course. */
export const devil: BehaviourFactory = (host, world) => {
  const ring = host.scene.add.circle(host.x, host.y, RADIUS, SAND, 0.07).setStrokeStyle(1, SAND, 0.35).setDepth(2);
  const dust = host.scene.add
    .particles(0, 0, Tex.puff, { follow: host, frequency: 60, lifespan: 700, speed: { min: 10, max: 30 }, scale: { start: 1.2, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: SAND })
    .setDepth(6);
  let nextWindAt = 0;

  const pullPlayer = (delta: number): void => {
    const { target } = host;
    if (target.dead || target.isDashing) return;
    const move = pullToward(host, target, RADIUS, PULL, delta);
    if (move.x === 0 && move.y === 0) return;
    const to = { x: target.x + move.x, y: target.y + move.y };
    if (bodyClear(to, PLAYER_RADIUS, host.isBlocked)) target.setPosition(to.x, to.y);
  };

  const bendBolts = (delta: number): void => {
    for (const bolt of (world.bolts?.getChildren() ?? []) as Projectile[]) {
      if (!bolt.active || !bolt.body) continue;
      const v = bolt.body.velocity;
      if (Math.hypot(bolt.x - host.x, bolt.y - host.y) > RADIUS) continue;
      const bent = bendVelocity(v, bolt, host, RADIUS, BEND, delta);
      bolt.setVelocity(bent.x, bent.y);
    }
  };

  return {
    act(time) {
      host.chase(time, host.def.speed * (0.7 + 0.5 * Math.sin(time / 900)));
    },
    update(time, delta) {
      ring.setPosition(host.x, host.y);
      host.setFlipX(Math.floor(time / 110) % 2 === 0);
      if (!host.alive) return;
      if (host.armed) {
        pullPlayer(delta);
        bendBolts(delta);
      }
      if (time >= nextWindAt && Math.hypot(host.target.x - host.x, host.target.y - host.y) < RADIUS * 1.5) {
        nextWindAt = time + 1800;
        playSfx(host.scene, 'wind');
      }
    },
    onDeath() {
      ring.destroy();
      dust.destroy();
    },
    destroy() {
      ring.destroy();
      dust.destroy();
    },
  };
};
