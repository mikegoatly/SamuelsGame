import { skillLearnedCard, skillSwapCard } from '../content/cards';
import { getSkill } from '../content/skills';
import { equipSkillInSlot, grantSkill, skillLevel } from '../logic/save';
import { planAcquisition } from '../logic/skillAcquire';
import type { CardPresenter } from './CardPresenter';
import type { SaveSystem } from './SaveSystem';
import type { SkillSystem } from './SkillSystem';
import { playSfx } from './sfx';
import type Phaser from 'phaser';

/** What the caller should tell the player: a card is on its way, or fall back to floating text. */
export type LearnOutcome = 'none' | 'card' | 'learned' | 'bag';

/** Teaches a skill (scroll pickup): equips it into a free slot, or owns it and asks which slot to replace when all three are taken. */
export class SkillAcquisition {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly save: SaveSystem,
    private readonly skills: Pick<SkillSystem, 'reload'>,
    private readonly cards: Pick<CardPresenter, 'request'>,
  ) {}

  learn(skillId: string): LearnOutcome {
    const skill = getSkill(skillId);
    if (!skill) return 'none';
    const plan = planAcquisition(this.save.data.loadout.slots, skillLevel(this.save.data, skillId) > 0, (id) => getSkill(id) !== undefined);
    if (plan.kind === 'known') return 'none';
    this.save.update((data) => grantSkill(data, skillId, plan.kind === 'equip'));
    this.skills.reload();
    playSfx(this.scene, 'charm');
    if (plan.kind === 'equip') return this.cards.request(`skill-${skillId}`, skillLearnedCard(skill, plan.slot)) ? 'card' : 'learned';
    return this.cards.request(`swap-${skillId}`, skillSwapCard(skill), 'SkillSwap') ? 'card' : 'bag';
  }

  /** The swap prompt's answer: replace `slot` with the new skill, or null to keep it in the bag. */
  resolveSwap(skillId: string, slot: number | null): void {
    if (slot === null) return;
    this.save.update((data) => equipSkillInSlot(data, slot, skillId));
    this.skills.reload();
  }
}
