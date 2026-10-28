import { SewerFrame } from '../../content/assetKeys';
import { getEnemy } from '../../content/enemies';
import { PUDDLE, splitsOnDeath, trailOptions } from '../../logic/blob';
import { enemyMaxHp } from '../../logic/combat';
import { FireTrail } from '../../logic/trail';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { groundEffects } from './ground';
import type { BehaviourFactory } from './types';

const SPLIT_SPREAD = 8;
const BOB_MS = 280;

/** Slow chaser that bobs between two squash frames and leaves slowing puddles; a full-strength blob bursts into two little ones when it dies. */
export const blob: BehaviourFactory = (host, world) => {
  const trail = new FireTrail(trailOptions());
  const ground = groundEffects(host.scene, host.clock);
  const baseFrame = host.def.textureFrame ?? SewerFrame.slimeBig;
  let nextDropAt = host.clock.now + PUDDLE.dropEveryMs;

  return {
    act(time) {
      host.chase(time);
      const now = host.clock.now;
      if (!host.armed || now < nextDropAt || host.target.dead || feel.isLocked) return;
      if (trail.drop(host.x, host.y + 4, now)) {
        nextDropAt = now + PUDDLE.dropEveryMs;
        ground.puddle(host.target, host.x, host.y + 4, host);
      }
    },
    update() {
      host.setFrame(baseFrame + (Math.floor(host.clock.now / BOB_MS) % 2));
    },
    onDeath() {
      const halves = splitsOnDeath(host.def.splitInto, host.maxHp, enemyMaxHp(host.def.baseHp, host.level));
      if (halves === 0 || host.mods.affix === 'splitting' || host.target.dead || feel.isLocked || !host.def.splitInto) return;
      const half = getEnemy(host.def.splitInto.id);
      const hp = enemyMaxHp(half.baseHp, host.level);
      for (let i = 0; i < halves; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const spot = world.clearSpot({ x: host.x + side * SPLIT_SPREAD, y: host.y });
        world.spawn(half.id, host.level, spot.x, spot.y, { hp });
      }
      playSfx(host.scene, 'squelch');
    },
  };
};
