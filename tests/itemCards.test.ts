import { describe, expect, it } from 'vitest';
import { CardQueue, charmCardText, markSeen, shouldQueueCard, shouldShowCard } from '../src/logic/itemCards';
import { defaultSave, parseSave, serialize } from '../src/logic/save';

describe('shouldShowCard', () => {
  it('always shows in always mode', () => {
    expect(shouldShowCard('always', ['charmOfPower'], 'charmOfPower')).toBe(true);
  });

  it('shows only unseen ids in first mode', () => {
    expect(shouldShowCard('first', [], 'charmOfPower')).toBe(true);
    expect(shouldShowCard('first', ['charmOfPower'], 'charmOfPower')).toBe(false);
    expect(shouldShowCard('first', ['charmOfPower'], 'charmOfSwiftness')).toBe(true);
  });
});

describe('markSeen', () => {
  it('records an id once', () => {
    const save = markSeen(markSeen(defaultSave(), 'a'), 'a');
    expect(save.seen).toEqual(['a']);
  });
});

describe('save migration', () => {
  it('defaults to first-time cards and an empty seen list', () => {
    const save = parseSave(JSON.stringify({ version: 4, coins: 2 }));
    expect(save.settings.itemCards).toBe('first');
    expect(save.seen).toEqual([]);
  });

  it('round trips and repairs junk', () => {
    const save = markSeen(defaultSave(), 'x');
    save.settings.itemCards = 'always';
    const loaded = parseSave(serialize(save));
    expect(loaded.seen).toEqual(['x']);
    expect(loaded.settings.itemCards).toBe('always');
    expect(parseSave(JSON.stringify({ settings: { itemCards: 'sometimes' }, seen: 4 })).settings.itemCards).toBe('first');
  });
});

describe('charmCardText', () => {
  it('describes the effect and the running total', () => {
    expect(charmCardText('power', 3)).toEqual({ effect: '+5% weapon damage. Permanent, stacks.', total: 'Power charms: 3 = +15% damage' });
    expect(charmCardText('swiftness', 2).total).toBe('Swiftness charms: 2 = +8% move speed');
    expect(charmCardText('vitality', 1).total).toBe('Vitality charms: 1 = +10 max HP');
  });
});

describe('shouldQueueCard', () => {
  it('skips ids already seen or already waiting in first mode', () => {
    expect(shouldQueueCard('first', [], [], 'a')).toBe(true);
    expect(shouldQueueCard('first', ['a'], [], 'a')).toBe(false);
    expect(shouldQueueCard('first', [], ['a'], 'a')).toBe(false);
  });

  it('queues duplicates in always mode', () => {
    expect(shouldQueueCard('always', ['a'], ['a'], 'a')).toBe(true);
  });
});

describe('CardQueue', () => {
  it('hands out cards in order and reports waiting ids', () => {
    const queue = new CardQueue<{ id: string }>();
    queue.push({ id: 'a' });
    queue.push({ id: 'b' });
    expect(queue.ids).toEqual(['a', 'b']);
    expect(queue.shift()).toEqual({ id: 'a' });
    expect(queue.shift()).toEqual({ id: 'b' });
    expect(queue.shift()).toBeUndefined();
  });

  it('clears', () => {
    const queue = new CardQueue<{ id: string }>();
    queue.push({ id: 'a' });
    queue.clear();
    expect(queue.shift()).toBeUndefined();
  });
});
