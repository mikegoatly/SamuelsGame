export type AccessorySlot = 'head';

export interface AccessoryDef {
  id: string;
  name: string;
  slot: AccessorySlot;
  /** Frame in the accessories-extra sheet. */
  frame: number;
  /** Level whose first Heroic clear awards it. */
  heroicRewardFor?: string;
}

export const accessories: readonly AccessoryDef[] = [
  { id: 'stoneCrown', name: 'Stone Crown', slot: 'head', frame: 0, heroicRewardFor: 'ruins' },
  { id: 'sunCrown', name: 'Sun Crown', slot: 'head', frame: 1, heroicRewardFor: 'desert' },
  { id: 'royalCrown', name: 'Royal Crown', slot: 'head', frame: 2, heroicRewardFor: 'palace' },
  { id: 'shadowCrown', name: 'Shadow Crown', slot: 'head', frame: 3 },
];

export const getAccessory = (id: string): AccessoryDef | undefined => accessories.find((a) => a.id === id);

/** The crown a level's first Heroic clear awards. */
export const crownFor = (levelId: string): AccessoryDef | undefined => accessories.find((a) => a.heroicRewardFor === levelId);
