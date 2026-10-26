export const shouldWake = (distance: number, range: number): boolean => distance <= range;

/**
 * What a room does when a monster dies: keep fighting while anything awake remains; once only dormant statues are left they are
 * woken (they must be fought, not skipped); with nothing left the wave is cleared.
 */
export function clearStatus(awake: number, dormant: number): 'fighting' | 'wake' | 'cleared' {
  if (awake > 0) return 'fighting';
  return dormant > 0 ? 'wake' : 'cleared';
}
