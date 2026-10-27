import { describe, expect, it } from 'vitest';
import { survivalCardLines } from '../src/logic/survivalCard';

const required = [
  { id: 'ruins', name: 'Ruins' },
  { id: 'desert', name: 'Desert' },
  { id: 'palace', name: 'Palace' },
];

describe('survivalCardLines', () => {
  it.each([
    ['nothing cleared', [], 0, false, ['Clear on Heroic: 0/3', 'Still to do: Ruins, Desert, Palace', 'Locked']],
    ['two cleared', ['ruins', 'palace'], 0, false, ['Clear on Heroic: 2/3', 'Still to do: Desert', 'Locked']],
    ['unlocked, no time', ['ruins', 'desert', 'palace'], 0, true, ['How long can you survive?', 'Monsters match your level', 'No time yet']],
    ['unlocked with best', ['palace', 'ruins', 'desert', 'x'], 272_000, true, ['How long can you survive?', 'Monsters match your level', 'Best 4:32']],
  ])('%s', (_name, cleared, bestMs, unlocked, lines) => {
    expect(survivalCardLines(required, cleared, bestMs)).toEqual({ unlocked, lines });
  });
});
