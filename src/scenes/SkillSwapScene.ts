import Phaser from 'phaser';
import { getSkill } from '../content/skills';
import { cooldownText } from '../content/cards';
import type { CardData } from '../logic/itemCards';
import { SLOT_COUNT } from '../logic/loadout';
import { saveSystem } from '../systems/SaveSystem';
import { gameText } from '../ui/gameText';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import { SkillTile } from '../ui/SkillTile';
import type { GameScene } from './GameScene';

const INPUT_DELAY_MS = 500;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 270;
const TILE_WIDTH = 124;
const TILE_HEIGHT = 62;
const EMPTY: CardData = { title: '', subtitle: '', color: '#ffffff', frame: 0, tint: null, lines: [] };

/** Modal over the paused game when a new skill is found with every slot full: replace one of the three equipped skills, or keep the new one in the bag. */
export class SkillSwapScene extends MenuScene {
  private card = EMPTY;

  constructor() {
    super('SkillSwap');
  }

  init(card: CardData): void {
    this.card = card;
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const { title, color, icon, skillId } = this.card;
    const skill = skillId ? getSkill(skillId) : undefined;
    const hex = Phaser.Display.Color.HexStringToColor(color).color;
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.8);
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, 0x2a2540).setStrokeStyle(4, hex);
    const top = cy - PANEL_HEIGHT / 2;
    menuText(this, cx, top + 16, 'New skill - all slots are full', 16, color);
    if (icon) this.add.image(cx - PANEL_WIDTH / 2 + 36, top + 56, icon).setScale(1.5);
    gameText(this, cx - PANEL_WIDTH / 2 + 68, top + 36, title, 16, { color }).setOrigin(0, 0);
    gameText(this, cx - PANEL_WIDTH / 2 + 68, top + 54, skill?.description ?? '', 16, { color: '#d8d8e8' }).setOrigin(0, 0).setWordWrapWidth(PANEL_WIDTH - 88);
    if (skill) gameText(this, cx - PANEL_WIDTH / 2 + 68, top + 92, cooldownText(skill), 16, { color: '#9a9ab8' }).setOrigin(0, 0);

    menuText(this, cx, top + 126, 'Replace which skill?', 16, '#ffe066');
    const slots = saveSystem.data.loadout.slots;
    const tiles = Array.from({ length: SLOT_COUNT }, (_, slot) => {
      const x = cx + (slot - 1) * (TILE_WIDTH + 6);
      const equipped = slots[slot];
      return new SkillTile(this, x, top + 168, TILE_WIDTH, TILE_HEIGHT, slot, equipped ? getSkill(equipped) : undefined, () => this.choose(slot));
    });
    const keep = new MenuButton(this, cx, top + PANEL_HEIGHT - 28, 200, 28, 'Keep in bag', () => this.choose(null));
    this.menu = new MenuList(this, [...tiles, keep], { columns: SLOT_COUNT, initialFocus: SLOT_COUNT, onBack: () => this.choose(null) });
  }

  private choose(slot: number | null): void {
    if (!this.inputReady(INPUT_DELAY_MS) || !this.card.skillId) return;
    (this.scene.get('Game') as GameScene).resolveSwap(this.card.skillId, slot);
  }
}
