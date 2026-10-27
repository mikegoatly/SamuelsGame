import { getAccessory } from '../content/accessories';
import { Frame, Tex } from '../content/assetKeys';
import { GEM_COLOURS, GEM_LABEL, type Gems } from '../logic/gems';
import type { CardData } from '../logic/itemCards';

export interface HeroicReward {
  gems: Gems;
  crownId?: string;
}

const GOLD = '#ffd84a';

export const gemsLine = (gems: Gems): string =>
  GEM_COLOURS.filter((colour) => gems[colour] > 0)
    .map((colour) => `+${gems[colour]} ${GEM_LABEL[colour]}`)
    .join(', ');

/** The card shown after a level's first Heroic clear: the crown it awards (if any) and the bonus gems. */
export function heroicRewardCard(reward: HeroicReward, levelName: string, autoWorn = false): CardData {
  const crown = reward.crownId ? getAccessory(reward.crownId) : undefined;
  const lines = [crown ? (autoWorn ? "You're wearing it! Swap crowns on the Loadout screen." : 'Find it on the Loadout screen.') : `${levelName} conquered on Heroic!`, `Bonus gems: ${gemsLine(reward.gems)}`];
  return crown
    ? { title: crown.name, subtitle: 'Heroic clear! New crown', color: GOLD, frame: crown.frame, tint: null, icon: Tex.accessories, lines }
    : { title: 'Heroic clear!', subtitle: levelName, color: GOLD, frame: Frame.ring, tint: 0xffd84a, lines };
}
