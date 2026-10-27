import { describe, expect, it } from 'vitest';
import { desert } from '../src/content/levels/desert';
import { palace } from '../src/content/levels/palace';
import { ruins } from '../src/content/levels/ruins';
import { SURVIVAL_PERF_CAP } from '../src/logic/survival';
import { gearedReference, estimateSurvival } from './balanceModel';

const source = { pools: [ruins, desert, palace].map((l) => l.enemyPool), perfCap: SURVIVAL_PERF_CAP };
const SEEDS = 12;
const runs = [20, 30, 40].map((hero) => {
  const results = Array.from({ length: SEEDS }, (_, seed) => estimateSurvival(hero, gearedReference(hero), source, seed));
  return { hero, results, minutes: results.map((r) => r.seconds / 60) };
});
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

describe('balance model: Heroic Survival', () => {


  it.each(runs.map((r) => [r.hero, r] as const))('hero %d: nobody survives forever: the run ends (always inside 15 minutes) after 5-10 minutes on average', (_, { minutes }) => {
    expect(mean(minutes)).toBeGreaterThan(5);
    expect(mean(minutes)).toBeLessThan(10);
    for (const m of minutes) {
      expect(m).toBeGreaterThan(3);
      expect(m).toBeLessThan(15);
    }
  });
});
