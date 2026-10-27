import type { SurvivalStage } from './survival';

/** What to shout when the run moves from one stage to the next; undefined when nothing the player would notice changed. */
export function stageAnnouncement(from: SurvivalStage, to: SurvivalStage): string | undefined {
  if (to.pool.length > from.pool.length) return 'New monsters!';
  if (to.levels[1] > from.levels[1]) return 'Tougher!';
  const quicker = to.timing.waveGapMs.first < from.timing.waveGapMs.first || to.timing.trickleMs < from.timing.trickleMs || to.timing.cap.base > from.timing.cap.base;
  return quicker ? 'Faster!' : undefined;
}
