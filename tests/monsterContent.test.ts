import { describe, expect, it } from 'vitest';
import { MonsterFrame } from '../src/content/assetKeys';
import { DEATH_TINTS } from '../src/content/deathTints';
import { enemies, getEnemy } from '../src/content/enemies';
import { infoOf, curveOf } from '../src/content/levels/curve';
import { arena } from '../src/content/levels/arena';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import type { LevelConfig } from '../src/content/levels';
import { items } from '../src/content/items';
import { lootTables } from '../src/content/lootTables';
import { dropChance } from '../src/logic/loot';
import { mulberry32 } from '../src/logic/rng';
import { planWave, wavesInRoom, waveSlots } from '../src/logic/waveMix';

const NEW: Record<string, { level: LevelConfig; ids: string[]; rooms: number }> = {
  ruins: { level: ruins, ids: ['ratSwarm', 'bombBeetle', 'skeletonArcher', 'wisp', 'necromancer'], rooms: 5 },
  desert: { level: desert, ids: ['fireImp', 'cactusTurret', 'mummyPriest', 'sandShark', 'dustDevil'], rooms: 6 },
  palace: { level: palace, ids: ['jester', 'mirrorKnight', 'houndmaster', 'gargoyle', 'twinMages'], rooms: 6 },
};

const coins = (table: string): number => {
  const t = lootTables[table]!;
  return t.entries.reduce((sum, e) => sum + (e.weight / 1000) * (items[e.itemId]!.kind === 'coin' ? (items[e.itemId] as { value: number }).value : 0), 0) * t.rolls;
};

describe('the fifteen new monsters', () => {
  it('each level gets its five, one introduced per room in the proposal order', () => {
    for (const { level, ids } of Object.values(NEW)) {
      expect(curveOf(level).intro).toEqual(ids);
      for (const id of ids) expect(level.enemyPool.map((e) => e.enemyId)).toContain(id);
      expect(new Set(curveOf(level).intro).size).toBe(ids.length);
    }
  });

  it('have a name, a loot table, a death tint and a sprite inside the sheet', () => {
    for (const { ids } of Object.values(NEW)) {
      for (const id of ids) {
        const def = getEnemy(id);
        const members = [def, ...(def.pack ? [getEnemy(def.pack.member)] : [])];
        for (const m of members) {
          expect(m.name, m.id).toBeDefined();
          expect(lootTables[m.lootTableId], m.id).toBeDefined();
          expect(DEATH_TINTS[m.id] ?? m.tint, m.id).toBeDefined();
          if (m.texture) expect(m.textureFrame ?? 0, m.id).toBeLessThanOrEqual(Math.max(...Object.values(MonsterFrame)));
        }
      }
    }
    expect(enemies.filter((e) => e.custom).length).toBeGreaterThanOrEqual(15);
  });

  it('packs spawn the sizes the proposal asks for', () => {
    expect(getEnemy('ratSwarm').pack).toMatchObject({ member: 'rat', count: [8, 12] });
    expect(getEnemy('houndmaster').pack).toMatchObject({ member: 'hound', count: [3, 3], leader: true });
    expect(getEnemy('twinMages').pack).toMatchObject({ member: 'twinMage', count: [2, 2] });
    expect(getEnemy('rat').baseHp).toBeLessThan(getEnemy('bat').baseHp);
  });

  it('use the intended behaviours', () => {
    expect(getEnemy('mirrorKnight')).toMatchObject({ behaviour: 'chaser' });
    expect(getEnemy('mirrorKnight').reflect).toBeDefined();
    expect(getEnemy('mirrorKnight').shield).toBeDefined();
    expect(getEnemy('cactusTurret').speed).toBe(0);
    expect(getEnemy('fireImp').speed).toBeGreaterThan(getEnemy('vulture').speed);
    expect(getEnemy('sandShark').custom).toBe('shark');
    expect(getEnemy('gargoyle').custom).toBe('gargoyle');
    expect(getEnemy('necromancer').raisable).toBe(false);
  });

  it('desert and palace newcomers pay as well as the monsters already there', () => {
    for (const id of ['sandShark', 'fireImp', 'cactusTurret', 'dustDevil', 'mummyPriest']) expect(coins(getEnemy(id).lootTableId), id).toBeGreaterThan(coins('bat'));
    for (const id of ['mirrorKnight', 'jester', 'gargoyle', 'houndmaster', 'twinMage', 'hound']) {
      const table = getEnemy(id).lootTableId;
      expect(coins(table), id).toBeGreaterThan(coins('mummy') * 0.5);
      expect(dropChance(lootTables[table]!, 'healthPotionLarge'), id).toBeGreaterThanOrEqual(0.07);
    }
  });

  it('the wave planner puts tanks in front and shooters at the back', () => {
    expect(infoOf('mummy').role).toBe('front');
    expect(infoOf('mirrorKnight').role).toBe('front');
    expect(infoOf('cyclops').cost).toBeGreaterThan(infoOf('slime').cost);
    for (const id of ['ghost', 'bandit', 'royalArcher', 'darkMage', 'skeletonArcher', 'necromancer', 'mummyPriest', 'twinMages']) expect(infoOf(id).role, id).toBe('back');
    expect(infoOf('stoneGuardian').eliteOk).toBe(false);
    expect(infoOf('ratSwarm').eliteOk).toBe(false);
  });
});

describe('room intensity per level', () => {
  const roomTotal = (level: LevelConfig, order: number): number => {
    const curve = curveOf(level);
    return Array.from({ length: wavesInRoom(curve, order) }, (_, w) => waveSlots(curve, order, w + 1)).reduce((a, b) => a + b, 0);
  };

  it('every level gets clearly harder room after room, the last room more than double the first', () => {
    for (const { level, rooms } of Object.values(NEW)) {
      for (let order = 2; order <= rooms; order++) expect(roomTotal(level, order), `${level.id} room ${order}`).toBeGreaterThanOrEqual(roomTotal(level, order - 1));
      expect(roomTotal(level, rooms)).toBeGreaterThan(roomTotal(level, 1) * 2.5);
    }
  });

  it('is much bigger than the old flat 2+wave waves', () => {
    const oldTotal = (waves: number[]): number => waves.reduce((sum, w) => sum + Math.min(12, 2 + w), 0);
    const oldRuins = [[1], [1, 2], [1, 2], [1, 2], [1, 2, 3]].map(oldTotal).reduce((a, b) => a + b, 0);
    const newRuins = Array.from({ length: 5 }, (_, i) => roomTotal(ruins, i + 1)).reduce((a, b) => a + b, 0);
    expect(newRuins).toBeGreaterThan(oldRuins * 1.6);
  });

  it('elites start in room 3 of every level', () => {
    for (const { level } of Object.values(NEW)) expect(curveOf(level).elite.fromRoom).toBe(3);
  });

  it('a real ruins plan shows its room monster and holds back later ones', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const first = planWave(ruins.enemyPool, curveOf(ruins), { order: 1, wave: 1, levels: [1, 1] }, infoOf, mulberry32(seed)).map((s) => s.enemyId);
      expect(first).toContain('ratSwarm');
      for (const later of ['bombBeetle', 'skeletonArcher', 'wisp', 'necromancer']) expect(first).not.toContain(later);
    }
  });

  it('the training arena keeps endless waves that grow to a cap, using the same mix rules', () => {
    const curve = curveOf(arena);
    expect(waveSlots(curve, 1, 1)).toBe(3);
    expect(waveSlots(curve, 2, 1)).toBeGreaterThan(waveSlots(curve, 1, 1));
    expect(waveSlots(curve, 60, 1)).toBe(12);
    const late = planWave(arena.enemyPool, curve, { order: 30, wave: 30, levels: arena.monsterLevelRange }, infoOf, mulberry32(3));
    expect(late.length).toBeGreaterThan(5);
    expect(late.every((s) => ['slime', 'bat', 'cyclops'].includes(s.enemyId))).toBe(true);
  });
});
