import { MinesFrame } from '../../content/assetKeys';
import { damageToPlayer } from '../../logic/combat';
import { shardRing } from '../../logic/shardRing';
import { feel } from '../../systems/feel';
import { playSfx } from '../../systems/sfx';
import { sparkBurst } from '../../systems/skills/skillFx';
import { distanceTo } from './steer';
import type { BehaviourFactory } from './types';

const SHARDS = 8;
const SHARD_SPEED = 95;
const SPAWN_OUT = 9;
const SHARD_RANGE = 72;
const SHARD_TINT = 0x7ae8ff;
const DAMAGE_SCALE = 0.7;
const FLICKER_MS = 220;

/** Drifts at you with its shards orbiting. It never attacks directly: when it pops it throws a ring of shards, so the safe way to kill it is from range. */
export const shard: BehaviourFactory = (host) => ({
  act(time) {
    if (host.armed) host.chase(time, host.def.speed * (distanceTo(host, host.target) < 40 ? 0.6 : 1));
  },
  update(time) {
    host.setFrame(Math.floor(time / FLICKER_MS) % 2 === 0 ? MinesFrame.wisp : MinesFrame.wispFlicker);
  },
  onDeath() {
    const { target, scene, shots } = host;
    sparkBurst(scene, host.x, host.y, SHARD_TINT, 10, 70);
    playSfx(scene, 'shatter');
    if (!host.armed || target.dead || target.actionsLocked || feel.isLocked) return;
    const damage = Math.max(1, Math.round(damageToPlayer(host.def.baseDamage, host.level, target.level) * DAMAGE_SCALE));
    const offset = Math.atan2(target.y - host.y, target.x - host.x) + Math.PI / SHARDS;
    for (const d of shardRing(SHARDS, offset)) shots.fire(host.x + d.x * SPAWN_OUT, host.y + d.y * SPAWN_OUT, d.x, d.y, SHARD_SPEED, damage, SHARD_RANGE, { tint: SHARD_TINT, scale: 1.1 });
  },
});
