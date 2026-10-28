import { SLOT_COUNT, slotRowLabel } from '../logic/saveSlots';
import { switchSaveSlot } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

const ROW_WIDTH = 330;
const ROW_HEIGHT = 30;
const ROW_GAP = 8;

export class SaveSlotsScene extends MenuScene {
  constructor() {
    super('SaveSlots');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const summaries = saveSystem.slotSummaries();
    menuText(this, cx, 34, 'Save slots', 28, '#b48cff');
    menuText(this, cx, 66, 'Your other slots are kept safe', 16, '#d8d8e8');
    let armed = -1;
    const rows: MenuButton[] = [];
    const baseLabel = (slot: number): string => slotRowLabel(slot, summaries[slot - 1]!, slot === saveSystem.activeSlot);
    const rowY = (i: number): number => 108 + i * (ROW_HEIGHT + ROW_GAP);
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      rows.push(new MenuButton(this, cx, rowY(slot - 1), ROW_WIDTH, ROW_HEIGHT, baseLabel(slot), () => this.choose(slot, summaries[slot - 1]!.empty, () => armed, (next) => {
        if (armed > 0) rows[armed - 1]!.setLabel(baseLabel(armed));
        armed = next;
        if (next > 0) rows[next - 1]!.setLabel(`Slot ${next}: Start new game? Press again`);
      })));
    }
    const back = new MenuButton(this, cx, Math.min(height - 28, rowY(SLOT_COUNT) + 12), 140, 30, 'Back', () => this.goBack());
    this.menu = new MenuList(this, [...rows, back], { onBack: () => this.goBack() });
  }

  private choose(slot: number, empty: boolean, armed: () => number, arm: (slot: number) => void): void {
    if (slot === saveSystem.activeSlot) return this.goBack();
    if (empty && armed() !== slot) return arm(slot);
    if (switchSaveSlot(this.game, slot)) this.goBack();
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
