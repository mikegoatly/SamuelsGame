import { describe, expect, it } from 'vitest';
import { SewerFrame } from '../src/content/assetKeys';
import { DEATH_TINTS } from '../src/content/deathTints';
import { enemies, getEnemy } from '../src/content/enemies';
import { curveOf, infoOf } from '../src/content/levels/curve';
import { SEWER_CURVE, SEWER_INTRO, SEWER_POOL } from '../src/content/levels/sewerMonsters';
import { lootTables } from '../src/content/lootTables';
import { enemyMaxHp } from '../src/logic/combat';
import { mulberry32 } from '../src/logic/rng';
import { planWave, wavesInRoom } from '../src/logic/waveMix';
import { sewer } from '../src/content/levels/sewer';

const IDS = [...SEWER_INTRO, 'sewerRat', 'sludgeBlobSmall'];

describe('the six sewer monsters', () => {
  it('debut one per room in the proposal order, all in the pool', () => {
    expect(SEWER_INTRO).toEqual(['sewerRatSwarm', 'sludgeBlob', 'pipeSpitter', 'bloatToad', 'sewerGator', 'moldShroom']);
    expect(SEWER_POOL.map((e) => e.enemyId).sort()).toEqual([...SEWER_INTRO].sort());
    expect(new Set(SEWER_INTRO).size).toBe(6);
    expect(wavesInRoom(SEWER_CURVE, 6)).toBe(3);
  });

  it.each(IDS)('%s has a name, a loot table, a death tint and a sprite (rats reuse the rat, the rest the sewer sheet)', (id) => {
    const def = getEnemy(id);
    expect(def.id).toBe(id);
    expect(def.name).toBeDefined();
    expect(lootTables[def.lootTableId]).toBeDefined();
    expect(DEATH_TINTS[id] ?? def.tint).toBeDefined();
    expect(def.texture).toBe(id.startsWith('sewerRat') ? 'monsters-extra' : 'sewer-extra');
    if (!id.startsWith('sewerRat')) expect(def.textureFrame ?? 0).toBeLessThanOrEqual(SewerFrame.spitterFiring);
  });

  it.each(SEWER_INTRO)('%s has a short child-readable tip', (id) => {
    const tip = getEnemy(id === 'sewerRatSwarm' ? 'sewerRat' : id).tip;
    expect(tip).toBeDefined();
    expect(tip!.length).toBeLessThanOrEqual(60);
    expect(tip).toMatch(/[.!]$/);
  });

  it('every id is registered so window.__spawn finds it', () => {
    for (const id of IDS) expect(enemies.map((e) => e.id)).toContain(id);
  });

  it('use the intended behaviours', () => {
    expect(getEnemy('sewerRat').custom).toBe('rat');
    expect(getEnemy('sewerRatSwarm').pack).toMatchObject({ member: 'sewerRat' });
    expect(getEnemy('sludgeBlob').custom).toBe('blob');
    expect(getEnemy('pipeSpitter').custom).toBe('spitter');
    expect(getEnemy('pipeSpitter').speed).toBe(0);
    expect(getEnemy('bloatToad').custom).toBe('toad');
    expect(getEnemy('sewerGator').custom).toBe('gator');
    expect(getEnemy('moldShroom').custom).toBe('shroom');
  });

  it('the blob splits into two smaller, quicker halves that cannot split again and are not raisable', () => {
    const blob = getEnemy('sludgeBlob');
    const half = getEnemy(blob.splitInto!.id);
    expect(blob.splitInto!.count).toBe(2);
    expect(half.splitInto).toBeUndefined();
    expect(half.baseHp * 2).toBeLessThan(blob.baseHp);
    expect(half.speed).toBeGreaterThan(blob.speed);
    expect(blob.raisable).toBe(false);
  });

  it('are tougher than the desert and no tougher than the palace for the same role', () => {
    expect(getEnemy('sewerGator').baseHp).toBeGreaterThan(getEnemy('sandShark').baseHp * 0.85);
    expect(getEnemy('sewerGator').baseHp).toBeLessThan(getEnemy('gargoyle').baseHp * 1.2);
    expect(getEnemy('pipeSpitter').baseHp).toBeGreaterThan(getEnemy('cactusTurret').baseHp);
    expect(getEnemy('sewerRat').baseHp).toBeGreaterThan(getEnemy('rat').baseHp);
    expect(enemyMaxHp(getEnemy('moldShroom').baseHp, 8)).toBeGreaterThan(enemyMaxHp(getEnemy('mummyPriest').baseHp, 8) * 0.9);
  });

  it('loot pays between the desert and the palace for the same role', () => {
    const coinValue = (table: string): number => {
      const t = lootTables[table]!;
      return t.entries.filter((e) => e.itemId.startsWith('coin') || e.itemId.startsWith('gold')).reduce((sum, e) => sum + e.weight, 0);
    };
    expect(coinValue('sewerGator')).toBeGreaterThanOrEqual(coinValue('sandShark') * 0.9);
    expect(coinValue('moldShroom')).toBeLessThanOrEqual(coinValue('gargoyle') + 100);
    expect(lootTables['sludgeBlobSmall']!.entries.length).toBeGreaterThan(0);
  });

  it('elites are allowed except for rat packs; the spitter is a back-line shooter', () => {
    for (const id of ['sludgeBlob', 'pipeSpitter', 'bloatToad', 'sewerGator', 'moldShroom']) expect(infoOf(id).eliteOk, id).toBe(true);
    expect(infoOf('sewerRatSwarm').eliteOk).toBe(false);
    expect(infoOf('pipeSpitter').role).toBe('back');
    expect(infoOf('moldShroom').role).toBe('back');
  });

  it('every wave of every room is plannable and features the room monster', () => {
    const level = { ...sewer, enemyPool: SEWER_POOL, curve: SEWER_CURVE };
    const curve = curveOf(level);
    SEWER_INTRO.forEach((featured, i) => {
      for (let wave = 1; wave <= wavesInRoom(curve, i + 1); wave++) {
        const spawns = planWave(level.enemyPool, curve, { order: i + 1, wave, levels: [8, 11] }, infoOf, mulberry32(i * 31 + wave));
        expect(spawns.map((s) => s.enemyId)).toContain(featured);
        for (const s of spawns) expect(s.level).toBeGreaterThanOrEqual(8);
      }
    });
  });
});
