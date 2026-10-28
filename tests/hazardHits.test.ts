import { describe, expect, it } from 'vitest';
import { HAZARD_HITS, sustainedFractionPerSecond } from '../src/logic/hazard/hits';
import { PLAYER_IFRAMES_MS } from '../src/logic/playerTimers';
import { SPIKE_DAMAGE_FRACTION } from '../src/logic/spikes';
import { ACTIVE_HAZARD_KINDS } from '../src/logic/hazard/kinds';

const damaging = Object.entries(HAZARD_HITS);

describe('hazard hits', () => {
  it('covers every damaging hazard', () => {
    const kinds = ACTIVE_HAZARD_KINDS.filter((k) => k !== 'wind' && k !== 'sandstorm' && k !== 'flush');
    for (const kind of kinds) expect(HAZARD_HITS, kind).toHaveProperty(kind);
    expect(HAZARD_HITS.spikes.fraction).toBe(SPIKE_DAMAGE_FRACTION);
  });

  it('every single hit is survivable many times over: at most 12% of max health', () => {
    for (const [kind, hit] of damaging) expect(hit.fraction, kind).toBeLessThanOrEqual(0.12);
  });

  it('a repeating hit never comes faster than the player i-frames', () => {
    for (const [kind, hit] of damaging) if (hit.gapMs > 0) expect(hit.gapMs, kind).toBeGreaterThanOrEqual(PLAYER_IFRAMES_MS);
  });

  it('no hazard drains more than 6% of max health per second from someone who stays', () => {
    for (const [kind, hit] of damaging) expect(sustainedFractionPerSecond(hit), kind).toBeLessThanOrEqual(0.06);
  });

  it('spikes go through the same table with a real repeat gap', () => {
    expect(HAZARD_HITS.spikes.gapMs).toBeGreaterThan(0);
    expect(sustainedFractionPerSecond(HAZARD_HITS.spikes)).toBeGreaterThan(0);
  });

  it('standing in a hazard for 10 seconds does not kill a full-health player', () => {
    for (const [kind, hit] of damaging) expect(sustainedFractionPerSecond(hit) * 10, kind).toBeLessThan(1);
  });
});
