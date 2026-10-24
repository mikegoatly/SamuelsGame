export type GemColour = 'red' | 'green' | 'blue';
export type Gems = Record<GemColour, number>;

export const GEM_COLOURS: readonly GemColour[] = ['red', 'green', 'blue'];
export const GEM_LABEL: Record<GemColour, string> = { red: 'Power', green: 'Swiftness', blue: 'Vitality' };
export const GEM_TINT: Record<GemColour, number> = { red: 0xff5a4a, green: 0x5aff8a, blue: 0x5aa8ff };

export const noGems = (): Gems => ({ red: 0, green: 0, blue: 0 });

/** v6 saves held charms; each one becomes a gem of the matching colour. */
export const CHARM_TO_GEM: Record<string, GemColour> = { power: 'red', swiftness: 'green', vitality: 'blue' };
export const LEGACY_CARD_IDS: Record<string, string> = { charmOfPower: 'gemRed', charmOfSwiftness: 'gemGreen', charmOfVitality: 'gemBlue' };

export const gemItemId = (colour: GemColour): string => `gem${colour[0]!.toUpperCase()}${colour.slice(1)}`;

export const totalGems = (gems: Gems): number => gems.red + gems.green + gems.blue;
