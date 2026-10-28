import { describe, expect, it } from 'vitest';
import { SaveSystem } from '../src/systems/SaveSystem';
import { serialize, withSettings } from '../src/logic/save';
import { aSave, fakeStorage } from './builders';

const progressed = (level: number, coins: number) => aSave({ progress: { level, xp: 0 }, coins });
const system = (storage: ReturnType<typeof fakeStorage>) => new SaveSystem(() => storage);

describe('save slots', () => {
  it('treats a legacy single save as slot 1, untouched', () => {
    const json = serialize(progressed(5, 120));
    const storage = fakeStorage({ 'samuels-game-save': json });
    const saves = system(storage);
    expect(saves.activeSlot).toBe(1);
    expect(saves.data.progress.level).toBe(5);
    expect(storage.items.get('samuels-game-save')).toBe(json);
  });

  it('starts a fresh game in an empty slot without touching slot 1', () => {
    const storage = fakeStorage({ 'samuels-game-save': serialize(progressed(5, 120)) });
    const saves = system(storage);
    saves.update((s) => s);
    const before = storage.items.get('samuels-game-save');
    expect(saves.switchTo(2)).toBe(true);
    expect(saves.activeSlot).toBe(2);
    expect(saves.data.progress.level).toBe(1);
    expect(saves.data.coins).toBe(0);
    expect(storage.items.get('samuels-game-save')).toBe(before);
    expect(storage.items.get('samuels-game-slot')).toBe('2');
    saves.update((s) => ({ ...s, coins: 9 }));
    expect(storage.items.get('samuels-game-save')).toBe(before);
    expect(storage.items.has('samuels-game-save-2')).toBe(true);
  });

  it('restores slot 1 when switching back, and remembers the slot on reload', () => {
    const storage = fakeStorage({ 'samuels-game-save': serialize(progressed(5, 120)) });
    const saves = system(storage);
    saves.switchTo(2);
    saves.update((s) => ({ ...s, coins: 9 }));
    saves.switchTo(1);
    expect(saves.data.progress.level).toBe(5);
    expect(saves.data.coins).toBe(120);
    saves.switchTo(2);
    expect(system(storage).activeSlot).toBe(2);
    expect(system(storage).data.coins).toBe(9);
  });

  it('saves unsaved in-memory progress of the current slot before switching', () => {
    const storage = fakeStorage();
    const saves = system(storage);
    saves.update((s) => ({ ...s, coins: 77 }));
    storage.items.clear();
    saves.switchTo(3);
    expect(JSON.parse(storage.items.get('samuels-game-save')!).coins).toBe(77);
  });

  it('carries settings across slots, both ways', () => {
    const storage = fakeStorage({ 'samuels-game-save-2': serialize(withSettings(progressed(3, 1), { musicVolume: 10, muted: true })) });
    const saves = system(storage);
    saves.update((s) => withSettings(s, { musicVolume: 40, reduceShake: true, itemCards: 'always' }));
    saves.switchTo(2);
    expect(saves.data.settings).toMatchObject({ musicVolume: 40, reduceShake: true, itemCards: 'always', muted: false });
    expect(saves.data.progress.level).toBe(3);
    saves.update((s) => withSettings(s, { muted: true }));
    saves.switchTo(1);
    expect(saves.data.settings.muted).toBe(true);
    expect(saves.data.settings.musicVolume).toBe(40);
  });

  it.each([[null], ['0'], ['9'], ['junk'], ['']])('active slot value %j falls back to slot 1', (raw) => {
    const storage = fakeStorage({ 'samuels-game-save': serialize(progressed(4, 0)), ...(raw === null ? {} : { 'samuels-game-slot': raw }) });
    const saves = system(storage);
    expect(saves.activeSlot).toBe(1);
    expect(saves.data.progress.level).toBe(4);
  });

  it('reads summaries without switching', () => {
    const storage = fakeStorage({ 'samuels-game-save-2': serialize(progressed(8, 50)), 'samuels-game-save-3': 'not json' });
    const saves = system(storage);
    expect(saves.slotSummaries()).toEqual([
      expect.objectContaining({ empty: false, level: 1 }),
      expect.objectContaining({ empty: false, level: 8, coins: 50 }),
      { empty: true },
    ]);
    expect(saves.activeSlot).toBe(1);
  });

  it('reset clears only the active slot', () => {
    const storage = fakeStorage({ 'samuels-game-save': serialize(progressed(5, 1)), 'samuels-game-save-2': serialize(progressed(6, 2)) });
    const saves = system(storage);
    saves.switchTo(2);
    saves.reset();
    expect(storage.items.has('samuels-game-save-2')).toBe(false);
    expect(storage.items.has('samuels-game-save')).toBe(true);
    expect(saves.data.progress.level).toBe(1);
  });

  it.each([[0], [4], [1.5], [Number.NaN]])('ignores invalid slot %s', (slot) => {
    const saves = system(fakeStorage());
    expect(saves.switchTo(slot)).toBe(false);
    expect(saves.activeSlot).toBe(1);
  });

  it('does not crash when storage throws', () => {
    const saves = system(fakeStorage({}, true));
    expect(saves.activeSlot).toBe(1);
    expect(saves.slotSummaries()).toHaveLength(3);
    expect(saves.switchTo(2)).toBe(false);
    expect(saves.activeSlot).toBe(1);
    expect(() => saves.update((s) => s)).not.toThrow();
    expect(() => saves.reset()).not.toThrow();
  });
});
