import type { Slots } from './loadout';
import type { SkillCooldowns } from './skillCooldown';

export interface SkillSlotStatus {
  skillId: string | null;
  ready: boolean;
  /** Cooldown progress, 0 just cast .. 1 ready. */
  fraction: number;
}

/** What the HUD and touch buttons show for each slot at `now`. */
export const slotStatuses = (slots: Slots, cooldowns: SkillCooldowns, now: number): SkillSlotStatus[] =>
  slots.map((skillId) =>
    skillId === null
      ? { skillId, ready: false, fraction: 0 }
      : { skillId, ready: cooldowns.ready(skillId, now), fraction: cooldowns.fraction(skillId, now) },
  );
