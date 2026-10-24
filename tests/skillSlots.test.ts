import { describe, expect, it } from 'vitest';
import { planAcquisition } from '../src/logic/skillAcquire';
import { SkillCooldowns } from '../src/logic/skillCooldown';
import { slotStatuses } from '../src/logic/skillSlots';

describe('slotStatuses', () => {
  it('reports empty slots as not ready with no skill', () => {
    expect(slotStatuses([null, null, null], new SkillCooldowns(), 0)).toEqual([
      { skillId: null, ready: false, fraction: 0 },
      { skillId: null, ready: false, fraction: 0 },
      { skillId: null, ready: false, fraction: 0 },
    ]);
  });

  it('reports ready skills and cooldown progress per slot', () => {
    const cooldowns = new SkillCooldowns();
    cooldowns.start('b', 1000, 2000);
    const [a, b, c] = slotStatuses(['a', 'b', null], cooldowns, 2000);
    expect(a).toEqual({ skillId: 'a', ready: true, fraction: 1 });
    expect(b).toMatchObject({ skillId: 'b', ready: false });
    expect(b!.fraction).toBeCloseTo(0.5);
    expect(c!.skillId).toBeNull();
  });
});

describe('planAcquisition', () => {
  it('ignores a skill the player already owns', () => {
    expect(planAcquisition([null, null, null], true)).toEqual({ kind: 'known' });
  });

  it('equips into the first empty slot', () => {
    expect(planAcquisition(['a', null, null], false)).toEqual({ kind: 'equip', slot: 1 });
  });

  it('asks the player to swap when every slot is full', () => {
    expect(planAcquisition(['a', 'b', 'c'], false)).toEqual({ kind: 'swap' });
  });

  it('treats unknown skill ids in a slot as empty', () => {
    const known = (id: string) => id !== 'ghost';
    expect(planAcquisition(['a', 'ghost', 'c'], false, known)).toEqual({ kind: 'equip', slot: 1 });
  });
});
