import Phaser from 'phaser';
import { getSkill, skillCooldown, skillParams, type SkillDef } from '../content/skills';
import { SLOT_COUNT } from '../logic/loadout';
import { skillLevel } from '../logic/save';
import { SkillCooldowns } from '../logic/skillCooldown';
import { slotStatuses, type SkillSlotStatus } from '../logic/skillSlots';
import type { SaveSystem } from './SaveSystem';
import { ArcaneShieldCaster } from './skills/ArcaneShieldCaster';
import { BlinkStrikeCaster } from './skills/BlinkStrikeCaster';
import { ChainLightningCaster } from './skills/ChainLightningCaster';
import { FireballCaster } from './skills/FireballCaster';
import { ExtraCasters } from './skills/extraCasters';
import { FrostNovaCaster } from './skills/FrostNovaCaster';
import type { SkillWorld } from './skills/types';

/** Registry key of the shared slot statuses (read by the touch buttons). */
export const SKILL_STATE_KEY = 'skillState';
/** A cast that does nothing (no target, blocked) cannot be retried for this long, so a held button does not spam it. */
const FIZZLE_MS = 300;

export interface SkillSystemOptions extends SkillWorld {
  save: SaveSystem;
}

/** Owns the three equipped slots and their cooldowns (on the pause-safe game clock); casting is delegated to one caster per skill kind. */
export class SkillSystem {
  /** Updated in place every frame for the HUD. */
  readonly statuses: SkillSlotStatus[] = Array.from({ length: SLOT_COUNT }, () => ({ skillId: null, ready: false, fraction: 0 }));

  private slots: (SkillDef | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
  private levels: number[] = Array.from({ length: SLOT_COUNT }, () => 1);
  private readonly cooldowns = new SkillCooldowns();
  private readonly fizzles = new SkillCooldowns();
  private readonly casters;

  constructor(private readonly o: SkillSystemOptions) {
    this.casters = {
      projectile: new FireballCaster(o),
      nova: new FrostNovaCaster(o),
      chain: new ChainLightningCaster(o),
      shield: new ArcaneShieldCaster(o),
      blink: new BlinkStrikeCaster(o),
      extra: new ExtraCasters(o),
    };
    o.player.skillHandler = (slot, x, y, aim) => this.cast(slot, x, y, aim);
    this.reload();
    o.scene.registry.set(SKILL_STATE_KEY, this.statuses);
    o.scene.events.on(Phaser.Scenes.Events.UPDATE, this.refresh, this);
    o.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => o.scene.events.off(Phaser.Scenes.Events.UPDATE, this.refresh, this));
  }

  /** Re-reads the equipped slots from the save (after a pickup or swap). Cooldowns stay with their skill. */
  reload(): void {
    const { loadout } = this.o.save.data;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const id = loadout.slots[i] ?? null;
      this.slots[i] = id === null ? null : (getSkill(id) ?? null);
      this.levels[i] = id === null ? 1 : Math.max(1, skillLevel(this.o.save.data, id));
    }
    this.refresh();
  }

  cast(slot: number, x: number, y: number, aim: Phaser.Math.Vector2): boolean {
    const skill = this.slots[slot];
    const { clock, player } = this.o;
    if (!skill || player.dead || !this.cooldowns.ready(skill.id, clock.now) || !this.fizzles.ready(skill.id, clock.now)) return false;
    const level = this.levels[slot] ?? 1;
    if (!this.dispatch(skill, level, x, y, aim)) {
      this.fizzles.start(skill.id, clock.now, FIZZLE_MS);
      return false;
    }
    this.cooldowns.start(skill.id, clock.now, skillCooldown(skill, level));
    this.refresh();
    return true;
  }

  private dispatch(skill: SkillDef, level: number, x: number, y: number, aim: Phaser.Math.Vector2): boolean {
    const call = { level, x, y, aim };
    switch (skill.kind) {
      case 'projectile':
        return this.casters.projectile.cast({ ...call, skill, params: skillParams(skill, level) });
      case 'nova':
        return this.casters.nova.cast({ ...call, skill, params: skillParams(skill, level) });
      case 'chain':
        return this.casters.chain.cast({ ...call, skill, params: skillParams(skill, level) });
      case 'shield':
        return this.casters.shield.cast({ ...call, skill, params: skillParams(skill, level) });
      case 'blink':
        return this.casters.blink.cast({ ...call, skill, params: skillParams(skill, level) });
      default:
        return this.casters.extra.cast(skill, call);
    }
  }

  private refresh(): void {
    const next = slotStatuses(
      this.slots.map((skill) => skill?.id ?? null),
      this.cooldowns,
      this.o.clock.now,
    );
    next.forEach((status, i) => Object.assign(this.statuses[i]!, status));
  }
}
