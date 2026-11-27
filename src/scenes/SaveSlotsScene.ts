import { deleteQuestion, SLOT_COUNT, slotRowLabel, type SlotSummary } from '../logic/saveSlots';
import { switchSaveSlot } from '../systems/audioSettings';
import { saveSystem } from '../systems/SaveSystem';
import { buildConfirmPanel } from '../ui/ConfirmPanel';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

const ROW_WIDTH = 330;
const ROW_HEIGHT = 30;
const ROW_GAP = 8;
const DELETE_WIDTH = 90;
const COLUMN_GAP = 8;
const CONFIRM_DELAY_MS = 300;
/** Each slot is a row and its Delete button, in a two-column grid. */
const deleteIndex = (slot: number): number => (slot - 1) * 2 + 1;

export class SaveSlotsScene extends MenuScene {
  /** The slot whose delete is being asked about; 0 when not asking. */
  private confirming = 0;
  private confirmOpenedAt = 0;

  constructor() {
    super('SaveSlots');
  }

  override create(): void {
    this.confirming = 0;
    super.create();
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const summaries = saveSystem.slotSummaries();
    menuText(this, cx, 34, 'Save slots', 28, '#b48cff');
    menuText(this, cx, 66, 'Your other slots are kept safe', 16, '#d8d8e8');
    let armed = -1;
    const rows: MenuButton[] = [];
    const items: MenuButton[] = [];
    const baseLabel = (slot: number): string => slotRowLabel(slot, summaries[slot - 1]!, slot === saveSystem.activeSlot);
    const rowY = (i: number): number => 108 + i * (ROW_HEIGHT + ROW_GAP);
    const rowX = cx - (DELETE_WIDTH + COLUMN_GAP) / 2;
    const deleteX = rowX + ROW_WIDTH / 2 + COLUMN_GAP + DELETE_WIDTH / 2;
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      const empty = summaries[slot - 1]!.empty;
      const row = new MenuButton(this, rowX, rowY(slot - 1), ROW_WIDTH, ROW_HEIGHT, baseLabel(slot), () => this.choose(slot, empty, () => armed, (next) => {
        if (armed > 0) rows[armed - 1]!.setLabel(baseLabel(armed));
        armed = next;
        if (next > 0) rows[next - 1]!.setLabel(`Slot ${next}: Start new game? Press again`);
      }));
      const remove = new MenuButton(this, deleteX, rowY(slot - 1), DELETE_WIDTH, ROW_HEIGHT, 'Delete', () => this.askDelete(slot, empty));
      remove.setEnabled(!empty);
      rows.push(row);
      items.push(row, remove);
    }
    const back = new MenuButton(this, cx, Math.min(height - 28, rowY(SLOT_COUNT) + 12), 140, 30, 'Back', () => this.goBack());
    if (this.confirming > 0) return this.buildConfirm(summaries[this.confirming - 1]!);
    this.menu = new MenuList(this, [...items, back], { columns: 2, onBack: () => this.goBack() });
  }

  private buildConfirm(summary: SlotSummary): void {
    const slot = this.confirming;
    const [yes, no] = buildConfirmPanel(this, {
      title: 'Delete save?',
      question: deleteQuestion(slot, summary, slot === saveSystem.activeSlot),
      yes: 'Delete',
      no: 'Keep it',
      border: 0xff6060,
      titleColor: '#ff8080',
      onYes: () => this.resolveDelete(true),
      onNo: () => this.resolveDelete(false),
    });
    this.menu = new MenuList(this, [yes, no], { columns: 2, initialFocus: 1, onBack: () => this.resolveDelete(false) });
  }

  private askDelete(slot: number, empty: boolean): void {
    if (empty) return;
    this.confirming = slot;
    this.confirmOpenedAt = this.time.now;
    this.rebuild();
    this.menu?.setFocus(1);
  }

  private resolveDelete(yes: boolean): void {
    const slot = this.confirming;
    if (slot === 0 || (yes && this.time.now - this.confirmOpenedAt < CONFIRM_DELAY_MS)) return;
    if (yes) saveSystem.deleteSlot(slot);
    this.confirming = 0;
    this.rebuild();
    this.menu?.setFocus(yes ? deleteIndex(slot) - 1 : deleteIndex(slot));
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
