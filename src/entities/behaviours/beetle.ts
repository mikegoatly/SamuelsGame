import { newFuse, stepFuse, fuseFlashOn, type FuseTuning } from '../../logic/fuse';
import { playSfx } from '../../systems/sfx';
import { detonate } from './blast';
import { distanceTo } from './steer';
import type { BehaviourFactory } from './types';

const TUNING: FuseTuning = { triggerRange: 30, fuseMs: 1000 };
const BLAST_RADIUS = 36;
const LIT_SPEED = 0.45;
const FLASH_TINT = 0xffffff;
const LIT_TINT = 0xff6a3a;

/** Rushes the player, lights its fuse up close and keeps shuffling forward while it flashes; the blast hurts everything near, monsters too. */
export const beetle: BehaviourFactory = (host, world) => {
  let state = newFuse();
  return {
    act(time) {
      const step = stepFuse(state, time, host.armed ? distanceTo(host, host.target) : Infinity, TUNING);
      state = step.state;
      if (step.event === 'lit') playSfx(host.scene, 'fuse');
      if (step.event === 'boom') {
        detonate(host.scene, world, host.target, { x: host.x, y: host.y, radius: BLAST_RADIUS, base: host.def.blastDamage ?? 18, level: host.level, except: host });
        host.suicide();
        return;
      }
      host.forcedTint = state.phase === 'lit' ? (fuseFlashOn(state, time, TUNING) ? FLASH_TINT : LIT_TINT) : null;
      host.applyBaseTint();
      host.chase(time, host.def.speed * (state.phase === 'lit' ? LIT_SPEED : 1));
    },
  };
};
