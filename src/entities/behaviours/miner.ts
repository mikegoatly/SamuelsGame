import { MinesFrame, Tex } from '../../content/assetKeys';
import { launchBlade, HitOnce, stepBlade, type BladeState } from '../../logic/boomerang';
import { damageToPlayer } from '../../logic/combat';
import { separationPush } from '../../logic/separation';
import { actStale } from '../../logic/spiderTether';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { directionTo, distanceTo, goToward, stand } from './steer';
import type { BehaviourFactory } from './types';

const THROW_RANGE = 135;
const THROW_EVERY_MS = 3200;
const WINDUP_MS = 380;
const OUT_SPEED = 150;
const BACK_SPEED = 175;
const HIT_RADIUS = 9;
const NEAR = 70;
const FAR = 120;
const SPIN = 0.5;
const WINDUP_TINT = 0xffffff;
const SEPARATION = 44;

/** Keeps a little distance and, after a visible wind-up (the arm goes back), throws a pickaxe that flies out, turns round and comes back to him; it can hit you both ways. */
export const miner: BehaviourFactory = (host, world) => {
  const phase = Math.random() * Math.PI * 2;
  let nextThrowAt = host.clock.now + 1200 + Math.random() * 1200;
  let windupUntil = 0;
  let aim = { x: 1, y: 0 };
  let blade: BladeState | null = null;
  let origin = { x: 0, y: 0 };
  let last = host.clock.now;
  let lastActAt = host.clock.now;
  let hits = new HitOnce<string>();
  const image = host.scene.add.image(host.x, host.y, Tex.mines, MinesFrame.pickaxe).setDepth(6).setVisible(false);

  const drop = (): void => {
    blade = null;
    image.setVisible(false);
  };
  const run = (): boolean => !host.target.dead && !host.target.actionsLocked && !feel.isLocked;

  return {
    act(time) {
      lastActAt = time;
      const distance = distanceTo(host, host.target);
      host.setFlipX(host.target.x < host.x);
      if (time < windupUntil) {
        stand(host);
        return;
      }
      if (windupUntil > 0) {
        windupUntil = 0;
        host.forcedTint = null;
        host.applyBaseTint();
        host.setFrame(MinesFrame.miner);
        aim = directionTo(host, host.target);
        blade = launchBlade(host);
        origin = { x: host.x, y: host.y };
        hits = new HitOnce<string>();
        image.setVisible(true);
        playSfx(host.scene, 'swing', { rate: 0.8 });
      }
      const speed = host.def.speed * host.speedFactor;
      if (host.armed && !blade && time >= nextThrowAt && distance <= THROW_RANGE && run()) {
        windupUntil = time + WINDUP_MS;
        nextThrowAt = windupUntil + THROW_EVERY_MS;
        host.setFrame(MinesFrame.minerThrow);
        host.forcedTint = WINDUP_TINT;
        host.applyBaseTint();
        stand(host);
        return;
      }
      if (distance > FAR) host.chase(time, host.def.speed);
      else if (distance < NEAR) {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else goToward(host, { x: host.x + Math.cos(time / 700 + phase), y: host.y + Math.sin(time / 700 + phase) }, speed * 0.4);
      const mates = world.all().filter((e) => e !== host && e.def.id === host.def.id);
      const push = separationPush(host, mates, SEPARATION, phase);
      if (push.x !== 0 || push.y !== 0) host.setVelocity(host.body!.velocity.x + push.x * speed * 1.4, host.body!.velocity.y + push.y * speed * 1.4);
    },
    update(time) {
      if (windupUntil > 0 && (host.stunned || actStale(host.clock.now, lastActAt))) {
        windupUntil = 0;
        nextThrowAt = host.clock.now + 1200;
        host.forcedTint = null;
        host.applyBaseTint();
        host.setFrame(MinesFrame.miner);
      }
      const dt = Math.min(100, host.clock.now - last);
      last = host.clock.now;
      if (!blade) return;
      if (!run()) return drop();
      const speed = blade.phase === 'out' ? OUT_SPEED : BACK_SPEED;
      blade = stepBlade(blade, { dir: aim, target: host, distance: (speed * dt) / 1000, range: THROW_RANGE, blocked: host.isBlocked, catchRadius: 8 }, origin);
      if (blade.done) return drop();
      image.setPosition(blade.x, blade.y).setRotation(time * SPIN * 0.02);
      const { target } = host;
      if (host.armed && Math.hypot(target.x - blade.x, target.y - blade.y) <= HIT_RADIUS && hits.claim(blade.phase, 'player')) {
        target.takeDamage(damageToPlayer(host.def.baseDamage, host.level, target.level), blade.x, blade.y, 'ranged');
        playSfx(host.scene, 'swordHit', { rate: 1.2 });
      }
    },
    onDeath: drop,
    destroy() {
      drop();
      image.destroy();
    },
  };
};
