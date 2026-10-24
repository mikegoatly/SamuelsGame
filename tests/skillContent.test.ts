import { describe, expect, it } from 'vitest';
import { skillGlyph } from '../src/content/inputGlyphs';
import { items } from '../src/content/items';
import { levels } from '../src/content/levels';
import { arcaneShield, blinkStrike, chainLightning, clampSkillLevel, fireball, frostNova, getSkill, MAX_SKILL_LEVEL, skillCooldown, skillIds, skillList, skillParams, skills } from '../src/content/skills';
import { enemies } from '../src/content/enemies';
import { lootTables } from '../src/content/lootTables';
import { FIREBALL } from '../src/logic/fireball';
import { SCROLL_CHANCE } from '../src/logic/skillScroll';

describe('skill definitions', () => {
  it('has ten skills with unique ids, keyed by id, and a description and icon each', () => {
    expect(skillIds).toEqual(['fireball', 'frostNova', 'chainLightning', 'boomerangBlade', 'arcaneShield', 'poisonCloud', 'spiritWolf', 'blinkStrike', 'meteor', 'gravityWell']);
    for (const skill of skillList) {
      expect(skills[skill.id]).toBe(skill);
      expect(skill.description.length).toBeGreaterThan(10);
      expect(skill.icon).toBe(`skill-${skill.id}`);
      expect(skill.maxLevel).toBe(MAX_SKILL_LEVEL);
    }
  });

  it('reads stats from a five-entry per-level table that never gets worse', () => {
    for (const skill of skillList) {
      expect(skill.cooldownMs).toHaveLength(5);
      expect(skill.params).toHaveLength(5);
      for (let level = 2; level <= 5; level++) expect(skillCooldown(skill, level), `${skill.id} L${level}`).toBeLessThan(skillCooldown(skill, level - 1));
    }
    expect(skillParams(fireball, 5).damage).toBeGreaterThan(skillParams(fireball, 1).damage);
  });

  it('level 1 fireball matches the original power', () => {
    const params = skillParams(fireball, 1);
    expect(skillCooldown(fireball, 1)).toBe(FIREBALL.cooldownMs);
    expect(params).toMatchObject({ radius: FIREBALL.radius, damage: FIREBALL.damage, speed: FIREBALL.speed, range: FIREBALL.range, edgeDamage: FIREBALL.edgeDamage });
  });

  it('level 1 matches the design numbers', () => {
    expect(skillParams(frostNova, 1)).toMatchObject({ slowFactor: 0.5, slowMs: 3000 });
    expect(skillParams(chainLightning, 1).jumps).toBe(4);
    expect(skillParams(arcaneShield, 1).durationMs).toBe(3000);
    expect(skillParams(blinkStrike, 1).distance).toBe(90);
  });

  it('clamps out-of-range levels and rejects unknown ids', () => {
    expect(clampSkillLevel(0)).toBe(1);
    expect(clampSkillLevel(99)).toBe(5);
    expect(skillCooldown(fireball, 99)).toBe(fireball.cooldownMs[4]);
    expect(getSkill('nope')).toBeUndefined();
    expect(getSkill('toString')).toBeUndefined();
  });
});

describe('skill acquisition content', () => {
  it('level rewards: Stone Guardian gives Arcane Shield, Sand Rat Fireball, Mad King Chain Lightning', () => {
    const rewards = Object.fromEntries(levels.filter((l) => l.rewardSkillIds).map((l) => [l.id, l.rewardSkillIds]));
    expect(rewards).toEqual({ ruins: ['arcaneShield'], desert: ['fireball'], palace: ['chainLightning'] });
  });

  it('Frost Nova and Blink Strike are only obtainable from scrolls', () => {
    const rewarded = levels.flatMap((l) => l.rewardSkillIds ?? []);
    expect(rewarded).not.toContain('frostNova');
    expect(rewarded).not.toContain('blinkStrike');
  });

  it('every skill has a scroll item', () => {
    for (const id of skillIds) expect(items[`scroll_${id}`], id).toMatchObject({ kind: 'skill', skillId: id });
  });

  it('boss loot tables use the boss scroll chance and ordinary ones the default', () => {
    const bossTables = new Set(Object.values(enemies).filter((e) => e.boss).map((e) => e.lootTableId));
    expect(bossTables).toEqual(new Set(['stoneGuardian', 'sandRat', 'madKing']));
    for (const table of Object.values(lootTables)) {
      expect(table.scrollChance ?? SCROLL_CHANCE.normal, table.id).toBe(bossTables.has(table.id) ? SCROLL_CHANCE.boss : SCROLL_CHANCE.normal);
    }
  });
});

describe('input glyphs', () => {
  it('maps every device and slot to a distinct frame inside the 34x24 prompt sheet', () => {
    for (const device of ['keyboard', 'gamepad'] as const) {
      const frames = [0, 1, 2].map((slot) => skillGlyph(device, slot));
      expect(new Set(frames).size).toBe(3);
      for (const frame of frames) expect(frame).toBeGreaterThanOrEqual(0);
      for (const frame of frames) expect(frame).toBeLessThan(34 * 24);
    }
    expect(skillGlyph('touch', 0)).toBeLessThan(34 * 24);
  });

  it('differs between keyboard and gamepad', () => {
    for (const slot of [0, 1, 2]) expect(skillGlyph('keyboard', slot)).not.toBe(skillGlyph('gamepad', slot));
  });
});
