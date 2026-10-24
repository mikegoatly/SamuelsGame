import { describe, expect, it } from 'vitest';
import { chargeLaneLength, newChargeState, stepCharge, type ChargeState, type ChargeTuning } from '../src/logic/charge';

const tuning: ChargeTuning = { triggerRange: 110, windupMs: 600, dashMs: 400, recoverMs: 700, dashSpeed: 280 };

function run(state: ChargeState, from: number, to: number, distance: number) {
  const log: { at: number; event: string }[] = [];
  let current = state;
  for (let now = from; now <= to; now += 50) {
    const step = stepCharge(current, now, distance, tuning);
    current = step.state;
    if (step.event) log.push({ at: now, event: step.event });
  }
  return { state: current, log };
}

describe('stepCharge', () => {
  it('stalks while the target is out of range', () => {
    const { state, log } = run(newChargeState(), 0, 2000, 300);
    expect(log).toEqual([]);
    expect(state.phase).toBe('stalk');
  });

  it('winds up, dashes, recovers and goes back to stalking in order', () => {
    const { log, state } = run(newChargeState(), 0, 2000, 80);
    expect(log.map((l) => l.event)).toEqual(['windup', 'dash', 'recover', 'stalk', 'windup']);
    expect(log[1]!.at - log[0]!.at).toBe(tuning.windupMs);
    expect(log[2]!.at - log[1]!.at).toBe(tuning.dashMs);
    expect(log[3]!.at - log[2]!.at).toBe(tuning.recoverMs);
    expect(state.phase).not.toBe('stalk');
  });

  it('commits to the charge even if the target leaves range during the windup', () => {
    const wound = stepCharge(newChargeState(), 0, 50, tuning);
    expect(wound.event).toBe('windup');
    expect(stepCharge(wound.state, 700, 999, tuning).event).toBe('dash');
  });

  it('lane length is dash speed times dash time', () => {
    expect(chargeLaneLength(tuning)).toBeCloseTo(112);
  });
});
