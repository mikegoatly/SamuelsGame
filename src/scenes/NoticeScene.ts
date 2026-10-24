import { Frame } from '../content/assetKeys';
import { CHARMS_NOTICE, dismissNotice } from '../logic/save';
import type { CardData } from '../logic/itemCards';
import { saveSystem } from '../systems/SaveSystem';
import { ItemCardScene } from './ItemCardScene';

export const CHARMS_CARD: CardData = {
  title: 'Charms are gems now',
  subtitle: 'Your charms have become gems',
  color: '#d08cff',
  frame: Frame.ring,
  tint: 0xd08cff,
  lines: ['Spend them at the Camp to upgrade skills and weapons.', 'Nothing was lost: each charm became a gem of the matching colour.'],
};

/** A one-time card over a menu screen (the item card look); closing it marks the notice seen and resumes the screen below. */
export class NoticeScene extends ItemCardScene {
  private under = 'LevelSelect';
  private noticeId = CHARMS_NOTICE;

  constructor() {
    super('Notice');
  }

  override init(data: CardData & { under?: string; noticeId?: string }): void {
    super.init(data);
    this.under = data.under ?? 'LevelSelect';
    this.noticeId = data.noticeId ?? CHARMS_NOTICE;
  }

  protected override close(): void {
    saveSystem.update((save) => dismissNotice(save, this.noticeId));
    this.scene.stop();
    this.scene.resume(this.under);
  }
}
