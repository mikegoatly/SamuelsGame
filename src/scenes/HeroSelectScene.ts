import Phaser from 'phaser';
import { getAccessory } from '../content/accessories';
import { getHero, heroList, type HeroDef } from '../content/heroes';
import { getLevel } from '../content/levels';
import { getWeapon } from '../content/weapons';
import { selectHero } from '../logic/heroSave';
import { saveSystem } from '../systems/SaveSystem';
import { gameText } from '../ui/gameText';
import { HeroCard } from '../ui/HeroCard';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export interface HeroSelectData {
  levelId: string;
  heroic?: boolean;
}

const COLUMNS = 4;
const GAP = 6;
const TOP = 36;
const CARD_HEIGHT = 80;
const PANEL_HEIGHT = 80;
const BUTTON_HEIGHT = 26;

/** Between level select and the loadout: pick who plays. Locked heroes show a silhouette and a hint. Enter on a hero selects it and moves on to Continue; Skip keeps the last hero. */
export class HeroSelectScene extends MenuScene {
  private levelId = 'arena';
  private heroic = false;
  private selected = 'wizard';
  private cards: HeroCard[] = [];
  private detail?: Phaser.GameObjects.Container;
  private wrap = 400;

  constructor() {
    super('HeroSelect');
  }

  init(data: Partial<HeroSelectData>): void {
    this.levelId = data.levelId ?? 'arena';
    this.heroic = data.heroic === true;
    this.selected = saveSystem.data.heroes.selected;
  }

  protected build(): void {
    const { width } = this.scale;
    const cx = width / 2;
    const { unlocked } = saveSystem.data.heroes;
    menuText(this, cx, 18, 'Choose your hero', 24, '#b48cff');

    const cardWidth = Math.min(150, Math.floor((width - 24 - (COLUMNS - 1) * GAP) / COLUMNS));
    const gridWidth = COLUMNS * cardWidth + (COLUMNS - 1) * GAP;
    const left = cx - gridWidth / 2;
    const worn = saveSystem.data.accessories.worn.head;
    const crownFrame = worn ? getAccessory(worn)?.frame : undefined;
    this.cards = heroList.map((hero, i) => {
      const x = left + (i % COLUMNS) * (cardWidth + GAP) + cardWidth / 2;
      const y = TOP + Math.floor(i / COLUMNS) * (CARD_HEIGHT + GAP) + CARD_HEIGHT / 2;
      return new HeroCard(this, x, y, cardWidth, CARD_HEIGHT, hero, unlocked.includes(hero.id), (picked) => this.pick(picked), (focused) => this.showDetail(focused), crownFrame);
    });
    this.cards.forEach((card) => card.setSelected(card.hero.id === this.selected));

    const rows = Math.ceil(heroList.length / COLUMNS);
    const panelTop = TOP + rows * (CARD_HEIGHT + GAP) + 2;
    this.add.rectangle(cx, panelTop + PANEL_HEIGHT / 2, gridWidth, PANEL_HEIGHT, 0x201c33).setStrokeStyle(2, 0x4a4468);
    this.detail = this.add.container(left + 10, panelTop + 6);
    this.wrap = gridWidth - 20;

    const buttonY = panelTop + PANEL_HEIGHT + 10 + BUTTON_HEIGHT / 2;
    const buttonWidth = Math.floor((gridWidth - 2 * GAP) / 3);
    const at = (i: number): number => left + buttonWidth / 2 + i * (buttonWidth + GAP);
    const next = new MenuButton(this, at(0), buttonY, buttonWidth, BUTTON_HEIGHT, 'Continue', () => this.begin(true));
    const skip = new MenuButton(this, at(1), buttonY, buttonWidth, BUTTON_HEIGHT, 'Skip (last hero)', () => this.begin(false));
    const back = new MenuButton(this, at(2), buttonY, buttonWidth, BUTTON_HEIGHT, 'Back', () => this.goBack());
    menuText(this, cx, buttonY + BUTTON_HEIGHT / 2 + 12, `${getLevel(this.levelId).name}${this.heroic ? ' (Heroic)' : ''}`, 16, this.heroic ? '#ffd84a' : '#9a9ab8');

    const initialFocus = Math.max(0, heroList.findIndex((hero) => hero.id === this.selected));
    this.menu = new MenuList(this, [...this.cards, next, skip, back], { columns: COLUMNS, initialFocus, onBack: () => this.goBack() });
  }

  private pick(hero: HeroDef): void {
    this.selected = hero.id;
    this.cards.forEach((card) => card.setSelected(card.hero.id === hero.id));
    this.showDetail(hero);
    this.menu?.setFocus(this.cards.length);
  }

  private showDetail(hero: HeroDef): void {
    const { detail } = this;
    if (!detail) return;
    detail.removeAll(true);
    const unlocked = saveSystem.data.heroes.unlocked.includes(hero.id);
    const line = (y: number, value: string, color = '#d8d8e8'): void => {
      detail.add(gameText(this, 0, y, value, 16, { color }).setOrigin(0, 0).setWordWrapWidth(this.wrap));
    };
    if (!unlocked) {
      line(0, '???', '#9a9ab8');
      line(18, `"${hero.hint ?? 'A mystery.'}"`, '#ffe066');
      line(40, 'Locked. Do something different to meet this hero.', '#7878a0');
      return;
    }
    const weapon = getWeapon(hero.signatureWeaponId);
    line(0, `${hero.name}${hero.id === this.selected ? '  (selected)' : ''}`, '#ffe066');
    line(18, `${hero.passive.name}: ${hero.passive.text}`);
    line(40, `Signature weapon: ${weapon.name} (+10% damage)`, '#b0b0c8');
    line(56, getHero(hero.id).bio, '#7878a0');
  }

  private begin(saveChoice: boolean): void {
    if (!this.inputReady(250)) return;
    if (saveChoice) saveSystem.update((save) => selectHero(save, this.selected));
    this.scene.start('Loadout', { levelId: this.levelId, heroic: this.heroic });
  }

  private goBack(): void {
    this.scene.start('LevelSelect');
  }
}
