import Phaser from 'phaser';
import { getAccessory } from '../content/accessories';
import { Tex } from '../content/assetKeys';
import { Prompt } from '../content/inputGlyphs';
import { getHero } from '../content/heroes';
import { getLevel } from '../content/levels';
import { cooldownText } from '../content/cards';
import { getSkill, knownSkillIds } from '../content/skills';
import { getWeapon, usableWeapons, weaponAtLevel, weaponFor } from '../content/weapons';
import { cycleSlotSkill, SLOT_COUNT, type Slots } from '../logic/loadout';
import { cycleWorn } from '../logic/accessoryWear';
import { setLoadout, skillLevel, weaponLevel, wearAccessory } from '../logic/save';
import { nextWeapon } from '../logic/weaponCycle';
import { saveSystem } from '../systems/SaveSystem';
import { ChoiceRow, type ChoiceView } from '../ui/ChoiceRow';
import { gameText } from '../ui/gameText';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export interface LoadoutData {
  levelId: string;
  heroic?: boolean;
}

const ROW_HEIGHT = 34;
const ROW_GAP = 4;
const TOP = 66;
const BUTTON_HEIGHT = 26;
const SLOT_GLYPHS = [Prompt.key1, Prompt.key2, Prompt.key3] as const;
const NO_SKILLS_HINT = 'Skills come from boss rewards and rare scrolls dropped by monsters.';

/** Between level select and the level: pick the basic weapon and what goes in the three skill slots. Start saves the choice, Skip plays with the last saved one. */
export class LoadoutScene extends MenuScene {
  private levelId = 'arena';
  private heroic = false;
  private weapon = '';
  private slots: Slots = [];
  private info?: Phaser.GameObjects.Container;
  private wrap = 200;

  constructor() {
    super('Loadout');
  }

  init(data: Partial<LoadoutData>): void {
    this.levelId = data.levelId ?? 'arena';
    this.heroic = data.heroic === true;
    const { loadout, weapons, heroes } = saveSystem.data;
    this.weapon = weaponFor(loadout.weapon, heroes.selected, weapons.owned);
    this.slots = loadout.slots.map((id) => (id && getSkill(id) ? id : null));
  }

  protected build(): void {
    const { width } = this.scale;
    const cx = width / 2;
    menuText(this, cx, 20, 'Loadout', 24, '#b48cff');
    menuText(this, cx, 42, `${getLevel(this.levelId).name}${this.heroic ? ' (Heroic)' : ''}`, 16, this.heroic ? '#ffd84a' : '#d8d8e8');
    const hero = getHero(saveSystem.data.heroes.selected);
    const heroIcon = this.add.image(26, 28, Tex.tiles, hero.frame).setScale(2);
    if (hero.tint !== null) heroIcon.setTint(hero.tint);
    gameText(this, 46, 28, hero.name, 16, { color: hero.color }).setOrigin(0, 0.5);

    const leftWidth = Math.min(300, Math.floor(width * 0.48));
    const left = Math.max(12, Math.floor((width - leftWidth - 16 - Math.min(300, width * 0.46)) / 2));
    const rowX = left + leftWidth / 2;
    const rows = [this.weaponRow(rowX, TOP + ROW_HEIGHT / 2, leftWidth), ...Array.from({ length: SLOT_COUNT }, (_, slot) => this.slotRow(slot, rowX, TOP + (slot + 1) * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2, leftWidth)), this.headRow(rowX, TOP + (SLOT_COUNT + 1) * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2, leftWidth)];

    const rowCount = SLOT_COUNT + 2;
    const buttonsTop = TOP + rowCount * (ROW_HEIGHT + ROW_GAP) + 2;
    const buttonY = (i: number): number => buttonsTop + BUTTON_HEIGHT / 2 + i * (BUTTON_HEIGHT + 3);
    const start = new MenuButton(this, rowX, buttonY(0), leftWidth, BUTTON_HEIGHT, 'Start', () => this.begin(true));
    const skip = new MenuButton(this, rowX, buttonY(1), leftWidth, BUTTON_HEIGHT, 'Skip (last loadout)', () => this.begin(false));
    const back = new MenuButton(this, rowX, buttonY(2), leftWidth, BUTTON_HEIGHT, 'Back', () => this.goBack());

    const panelX = left + leftWidth + 16;
    const panelWidth = Math.min(300, Math.floor(width * 0.46));
    const panelHeight = rowCount * (ROW_HEIGHT + ROW_GAP) - ROW_GAP + 8;
    this.add.rectangle(panelX + panelWidth / 2, TOP - 4 + panelHeight / 2, panelWidth, panelHeight, 0x201c33).setStrokeStyle(2, 0x4a4468);
    this.info = this.add.container(panelX + 10, TOP + 8);
    this.wrap = panelWidth - 20;
    this.menu = new MenuList(this, [...rows, start, skip, back], { onBack: () => this.goBack() });
  }

  private weaponRow(x: number, y: number, width: number): ChoiceRow {
    const owned = (): string[] => usableWeapons(saveSystem.data.weapons.owned, saveSystem.data.heroes.selected);
    const view = (): ChoiceView => {
      const weapon = getWeapon(this.weapon);
      return { label: weapon.name, detail: `Lv${weaponLevel(saveSystem.data, weapon.id)} ${weapon.kind === 'melee' ? 'melee' : 'ranged'}`, icon: { texture: Tex.tiles, frame: weapon.frame, tint: weapon.tint }, color: '#ffffff', glyph: Prompt.mouseLeft };
    };
    return new ChoiceRow(this, x, y, width, ROW_HEIGHT, view, (direction) => {
      this.weapon = nextWeapon(owned(), this.weapon, direction);
      this.showInfo(0);
    }, () => this.showInfo(0));
  }

  private slotRow(slot: number, x: number, y: number, width: number): ChoiceRow {
    const owned = (): string[] => knownSkillIds(saveSystem.data.skills.owned.map((s) => s.id));
    const view = (): ChoiceView => {
      const skill = this.slots[slot] ? getSkill(this.slots[slot]!) : undefined;
      if (!skill) return { label: owned().length > 0 ? 'Empty' : 'No skills yet', detail: '', color: '#7878a0', glyph: SLOT_GLYPHS[slot] };
      return { label: skill.name, detail: `Lv${Math.max(1, skillLevel(saveSystem.data, skill.id))} ${cooldownText(skill, skillLevel(saveSystem.data, skill.id)).replace('Cooldown ', '')}`, icon: { texture: skill.icon }, color: '#ffffff', glyph: SLOT_GLYPHS[slot] };
    };
    return new ChoiceRow(this, x, y, width, ROW_HEIGHT, view, (direction) => {
      this.slots = cycleSlotSkill(this.slots, slot, owned(), direction);
      this.showInfo(slot + 1);
    }, () => this.showInfo(slot + 1));
  }

  private headRow(x: number, y: number, width: number): ChoiceRow {
    const owned = (): string[] => saveSystem.data.accessories.owned.filter((id) => getAccessory(id)?.slot === 'head');
    const view = (): ChoiceView => {
      const crown = this.worn() ? getAccessory(this.worn()!) : undefined;
      if (!crown) return { label: owned().length > 0 ? 'Head: none' : 'No crowns yet', detail: '', color: '#7878a0' };
      return { label: crown.name, detail: 'Head', icon: { texture: Tex.accessories, frame: crown.frame }, color: '#ffd84a' };
    };
    const slot = SLOT_COUNT + 1;
    return new ChoiceRow(this, x, y, width, ROW_HEIGHT, view, (direction) => {
      saveSystem.update((save) => wearAccessory(save, 'head', cycleWorn(owned(), this.worn(), direction)));
      this.showInfo(slot);
    }, () => this.showInfo(slot));
  }

  private worn = (): string | undefined => saveSystem.data.accessories.worn.head;

  /** Details for the focused row in the right-hand panel. */
  private showInfo(index: number): void {
    const { info } = this;
    if (!info) return;
    info.removeAll(true);
    const text = (y: number, value: string, color = '#d8d8e8'): void => {
      info.add(gameText(this, 0, y, value, 16, { color }).setOrigin(0, 0).setWordWrapWidth(this.wrap));
    };
    if (index === 0) {
      const base = getWeapon(this.weapon);
      const level = weaponLevel(saveSystem.data, base.id);
      const weapon = weaponAtLevel(base, level);
      const icon = this.add.image(14, 14, Tex.tiles, weapon.frame).setScale(2);
      if (weapon.tint !== null) icon.setTint(weapon.tint);
      info.add(icon);
      text(36, `${weapon.name}  Lv ${level}/5`, '#ffe066');
      text(56, `Damage ${weapon.baseDamage}`);
      text(74, weapon.kind === 'melee' ? `${(1000 / weapon.fireRateMs).toFixed(1)} swings/s, hits an arc` : `${(1000 / weapon.fireRateMs).toFixed(1)} shots/s, range ${weapon.range}`);
      if (weapon.description) text(92, weapon.description, '#9a9ab8');
      text(110, usableWeapons(saveSystem.data.weapons.owned, saveSystem.data.heroes.selected).length > 1 ? 'Left/Right or tap to change' : 'Win more weapons from bosses', '#9a9ab8');
      return;
    }
    if (index === SLOT_COUNT + 1) {
      const crown = this.worn() ? getAccessory(this.worn()!) : undefined;
      if (crown) info.add(this.add.image(14, 14, Tex.accessories, crown.frame).setScale(2));
      text(36, crown ? crown.name : 'Head slot', '#ffd84a');
      text(58, saveSystem.data.accessories.owned.length > 0 ? 'Left/Right or tap to change' : 'Clear a level on Heroic to win its crown.', '#9a9ab8');
      return;
    }
    const skill = this.slots[index - 1] ? getSkill(this.slots[index - 1]!) : undefined;
    if (!skill) {
      text(0, `Skill slot ${index}`, '#ffe066');
      text(22, knownSkillIds(saveSystem.data.skills.owned.map((s) => s.id)).length > 0 ? 'Left/Right or tap to pick a skill.' : NO_SKILLS_HINT, '#9a9ab8');
      return;
    }
    const level = Math.max(1, skillLevel(saveSystem.data, skill.id));
    info.add(this.add.image(16, 16, skill.icon));
    info.add(gameText(this, 38, 8, skill.name, 16, { color: '#ffe066' }).setOrigin(0, 0));
    text(36, skill.description);
    text(112, `${cooldownText(skill, level)}   Level ${level}/${skill.maxLevel}`, '#9a9ab8');
  }

  private begin(saveChoice: boolean): void {
    if (!this.inputReady(250)) return;
    if (saveChoice) saveSystem.update((save) => setLoadout(save, { weapon: this.weapon, slots: this.slots }, weaponFor));
    this.scene.start('Game', { levelId: this.levelId, heroic: this.heroic });
  }

  private goBack(): void {
    this.scene.start('HeroSelect', { levelId: this.levelId, heroic: this.heroic });
  }
}
