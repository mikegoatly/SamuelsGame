import { describe, expect, it } from 'vitest';
import { stageAnnouncement } from '../src/logic/survivalAnnounce';
import type { SurvivalStage } from '../src/logic/survival';
import { DEFAULT_TIMING } from '../src/logic/waveSchedule';

function aStage(overrides: Partial<SurvivalStage> = {}): SurvivalStage {
  return { index: 0, levels: [10, 12], pool: [{ enemyId: 'rat', weight: 1 }], waveSlots: 6, eliteChance: 0, timing: DEFAULT_TIMING, ...overrides };
}

const faster = { ...DEFAULT_TIMING, waveGapMs: { ...DEFAULT_TIMING.waveGapMs, first: 8000 } };

describe('stageAnnouncement', () => {
  it.each([
    ['nothing changed', aStage(), aStage({ index: 1 }), undefined],
    ['higher monster levels', aStage(), aStage({ index: 1, levels: [11, 13] }), 'Tougher!'],
    ['wider pool', aStage(), aStage({ index: 1, pool: [{ enemyId: 'rat', weight: 1 }, { enemyId: 'bat', weight: 1 }] }), 'New monsters!'],
    ['shorter gaps', aStage(), aStage({ index: 1, timing: faster }), 'Faster!'],
    ['pool beats levels', aStage(), aStage({ index: 1, levels: [11, 13], pool: [{ enemyId: 'rat', weight: 1 }, { enemyId: 'bat', weight: 1 }] }), 'New monsters!'],
    ['levels beat timing', aStage(), aStage({ index: 1, levels: [11, 13], timing: faster }), 'Tougher!'],
  ])('%s', (_name, from, to, expected) => {
    expect(stageAnnouncement(from, to)).toBe(expected);
  });
});
