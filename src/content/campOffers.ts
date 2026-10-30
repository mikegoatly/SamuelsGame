import { buyPotion, buyRevive, buySkill, checkUpgrade, currentLevel, upgrade, type Purchase, type UpgradeTarget } from '../logic/campPurchases';
import { GEM_LABEL, GEM_TINT } from '../logic/gems';
import { POTION_HEAL_FRACTION } from '../logic/potions';
import { MAX_POTIONS, skillLevel, type SaveData } from '../logic/save';
import { POTION_PRICE, REVIVE_PRICE, shopStock, skillPrice } from '../logic/shop';
import { MAX_UPGRADE_LEVEL } from '../logic/upgrades';
import type { CampRowView } from '../ui/CampRow';
import { Frame, Tex } from './assetKeys';
import { cooldownText } from './cards';
import { findableSkillIds, getSkill, knownSkillIds } from './skills';
import { skillUpgradeInfo, TIER_MULTIPLIER, upgradeInfoFor } from './upgradeInfo';
import { previewUpgrade } from './upgradePreview';
import { getWeapon, usableWeapons } from './weapons';

const GOOD = '#7dffb0';
const BAD = '#ff8a8a';
const GOLD = '#ffe066';
const HERO_TINT = 0xffe066;

export interface Offer {
  view: CampRowView;
  /** Panel text for the focused row. */
  title: string;
  lines: string[];
  note: { text: string; color: string };
  /** Applies the purchase to a save. */
  buy: (save: SaveData) => Purchase;
  /** Floating text and star colour on success. */
  success: { text: string; tint: number };
}

const affordTag = (price: number, reason: string | null): { tag: string; tagColor: string } => ({ tag: `${price}g`, tagColor: reason ? BAD : GOOD });

function upgradeOffer(save: SaveData, target: UpgradeTarget, name: string, icon: CampRowView['icon']): Offer {
  const level = currentLevel(save, target);
  const { cost, reason } = checkUpgrade(save, target);
  const info = upgradeInfoFor(target.kind, target.id);
  const { lines, twist } = previewUpgrade(target.kind, target.id, level);
  const maxed = level >= MAX_UPGRADE_LEVEL;
  const gemName = `${GEM_LABEL[target.gem]} gem${cost && cost.gems > 1 ? 's' : ''}`;
  const priced = cost
    ? { ...affordTag(cost.gold, reason), gem: { colour: target.gem, count: cost.gems, enough: save.gems[target.gem] >= cost.gems } }
    : { tag: 'MAX', tagColor: GOLD };
  return {
    view: { icon, label: name, labelColor: '#ffffff', pips: { level, max: MAX_UPGRADE_LEVEL }, ...priced },
    title: maxed ? `${name}  Lv ${level} (max)` : `${name}  Lv ${level} -> ${level + 1}`,
    lines: maxed ? [`Level 5 twist: ${info?.twist ?? ''}`] : [lines.join(', '), ...(twist ? [`Level 5 twist: ${twist}`] : [])],
    note: cost ? (reason ? { text: reason, color: BAD } : { text: `Upgrade: ${cost.gold} gold + ${cost.gems} ${gemName}`, color: GOOD }) : { text: 'Fully upgraded', color: GOLD },
    buy: (current) => upgrade(current, target),
    success: { text: `${name} Lv ${level + 1}!`, tint: GEM_TINT[target.gem] },
  };
}

/** Owned weapons then owned skills, each with its next-level preview and price. */
export function upgradeOffers(save: SaveData): Offer[] {
  const offers: Offer[] = [];
  for (const id of usableWeapons(save.weapons.owned, save.heroes.selected)) {
    const info = upgradeInfoFor('weapon', id);
    if (!info) continue;
    const weapon = getWeapon(id);
    const target: UpgradeTarget = { kind: 'weapon', id, gem: info.gem, tierMult: TIER_MULTIPLIER[info.tier] };
    offers.push(upgradeOffer(save, target, weapon.name, { texture: Tex.tiles, frame: weapon.frame, tint: weapon.tint }));
  }
  for (const id of knownSkillIds(save.skills.owned.map((s) => s.id))) {
    const skill = getSkill(id)!;
    const info = skillUpgradeInfo[id];
    if (!info) continue;
    const target: UpgradeTarget = { kind: 'skill', id, gem: info.gem, tierMult: TIER_MULTIPLIER[info.tier] };
    offers.push(upgradeOffer(save, target, skill.name, { texture: skill.icon }));
  }
  return offers;
}

function skillOffer(save: SaveData, id: string): Offer {
  const skill = getSkill(id)!;
  const info = skillUpgradeInfo[id];
  const price = skillPrice(info?.tier ?? 1);
  const reason = save.coins < price ? `Need ${price - save.coins} more gold` : null;
  return {
    view: { icon: { texture: skill.icon }, label: skill.name, labelColor: '#ffffff', ...affordTag(price, reason) },
    title: skill.name,
    lines: [skill.description, `${cooldownText(skill)}. Upgrades with ${GEM_LABEL[info?.gem ?? 'red']} gems.`],
    note: reason ? { text: reason, color: BAD } : { text: `Buy for ${price} gold`, color: GOOD },
    buy: (current) => buySkill(current, id, price),
    success: { text: `${skill.name} learned!`, tint: skill.color },
  };
}

function potionOffer(save: SaveData): Offer {
  const full = save.potions >= MAX_POTIONS;
  const reason = full ? 'Carrying the most you can' : save.coins < POTION_PRICE ? `Need ${POTION_PRICE - save.coins} more gold` : null;
  return {
    view: { icon: { texture: Tex.tiles, frame: Frame.potionSmall }, label: `Health Potion  ${save.potions}/${MAX_POTIONS}`, labelColor: '#ffffff', ...affordTag(POTION_PRICE, reason) },
    title: 'Health Potion',
    lines: [`Carry up to ${MAX_POTIONS}. Drink one in a level (F, Y or the potion button) to heal ${Math.round(POTION_HEAL_FRACTION * 100)}% of your HP.`],
    note: reason ? { text: reason, color: BAD } : { text: `Buy for ${POTION_PRICE} gold`, color: GOOD },
    buy: buyPotion,
    success: { text: 'Potion packed!', tint: 0xff8a8a },
  };
}

function reviveOffer(save: SaveData): Offer {
  const reason = save.revive ? 'Already holding one' : save.coins < REVIVE_PRICE ? `Need ${REVIVE_PRICE - save.coins} more gold` : null;
  return {
    view: {
      icon: { texture: Tex.tiles, frame: Frame.hero, tint: HERO_TINT },
      label: 'Revive Token',
      labelColor: '#ffffff',
      tag: save.revive ? 'OWNED' : `${REVIVE_PRICE}g`,
      tagColor: save.revive ? GOLD : reason ? BAD : GOOD,
    },
    title: 'Revive Token',
    lines: ['Fall in a level and you rise again once with half your HP and a moment of safety. Used up when it happens.'],
    note: reason ? { text: reason, color: save.revive ? GOLD : BAD } : { text: `Buy for ${REVIVE_PRICE} gold`, color: GOOD },
    buy: buyRevive,
    success: { text: 'Revive Token ready!', tint: HERO_TINT },
  };
}

/** Three rotating skills, then potions and the revive token. */
export function shopOffers(save: SaveData): Offer[] {
  const stock = shopStock(save.shop.rotation, findableSkillIds, save.skills.owned.map((s) => s.id));
  return [...stock.filter((id) => skillLevel(save, id) === 0).map((id) => skillOffer(save, id)), potionOffer(save), reviveOffer(save)];
}
