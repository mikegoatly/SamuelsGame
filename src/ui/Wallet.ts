import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import { GEM_COLOURS, GEM_TINT, type Gems } from '../logic/gems';
import { gameText } from './gameText';

export interface CountEntry {
  frame: number;
  tint: number;
  text: string;
  color?: string;
}

const GOLD_TINT = 0xffd84a;
const ICON_GAP = 4;
const ENTRY_GAP = 14;

/** Gold first, then the three gem colours. */
export const walletEntries = (gold: number, gems: Gems, prefix = ''): CountEntry[] => [
  { frame: Frame.coin, tint: GOLD_TINT, text: `${prefix}${gold}`, color: '#ffe066' },
  ...GEM_COLOURS.map((colour) => ({ frame: Frame.ring, tint: GEM_TINT[colour], text: `${prefix}${gems[colour]}`, color: gems[colour] > 0 ? '#ffffff' : '#7878a0' })),
];

/** Icons with counts centred on `cx`, e.g. "coin 120  red 3  green 0  blue 1". */
export function drawCounts(scene: Phaser.Scene, cx: number, y: number, entries: readonly CountEntry[]): Phaser.GameObjects.Container {
  const texts = entries.map((entry) => gameText(scene, 0, y, entry.text, 16, { color: entry.color ?? '#ffffff' }).setOrigin(0, 0.5));
  const widths = texts.map((text) => 16 + ICON_GAP + text.width);
  let x = cx - (widths.reduce((sum, w) => sum + w, 0) + ENTRY_GAP * (entries.length - 1)) / 2;
  const parts: Phaser.GameObjects.GameObject[] = [];
  entries.forEach((entry, i) => {
    parts.push(scene.add.image(Math.round(x + 8), y, Tex.tiles, entry.frame).setTint(entry.tint));
    texts[i]!.setX(Math.round(x + 16 + ICON_GAP));
    parts.push(texts[i]!);
    x += widths[i]! + ENTRY_GAP;
  });
  return scene.add.container(0, 0, parts);
}
