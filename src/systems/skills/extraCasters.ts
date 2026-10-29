import type Phaser from 'phaser';
import { skillParams, type ExtraSkill } from '../../content/skills';
import { BoomerangCaster } from './BoomerangCaster';
import { GravityWellCaster } from './GravityWellCaster';
import { MeteorCaster } from './MeteorCaster';
import { PebbleCaster } from './PebbleCaster';
import { PoisonCloudCaster } from './PoisonCloudCaster';
import { SpiritWolfCaster } from './SpiritWolfCaster';
import type { SkillWorld } from './types';

interface Call {
  level: number;
  x: number;
  y: number;
  aim: Phaser.Math.Vector2;
}

/** The casters for the skills added in v2 phase 2, behind one entry point so SkillSystem needs a single dispatch line. */
export class ExtraCasters {
  private readonly boomerang: BoomerangCaster;
  private readonly cloud: PoisonCloudCaster;
  private readonly wolf: SpiritWolfCaster;
  private readonly meteor: MeteorCaster;
  private readonly well: GravityWellCaster;
  private readonly pebble: PebbleCaster;

  constructor(world: SkillWorld) {
    this.boomerang = new BoomerangCaster(world);
    this.cloud = new PoisonCloudCaster(world);
    this.wolf = new SpiritWolfCaster(world);
    this.meteor = new MeteorCaster(world);
    this.well = new GravityWellCaster(world);
    this.pebble = new PebbleCaster(world);
  }

  cast(skill: ExtraSkill, call: Call): boolean {
    switch (skill.kind) {
      case 'boomerang':
        return this.boomerang.cast({ ...call, skill, params: skillParams(skill, call.level) });
      case 'cloud':
        return this.cloud.cast({ ...call, skill, params: skillParams(skill, call.level) });
      case 'wolf':
        return this.wolf.cast({ ...call, skill, params: skillParams(skill, call.level) });
      case 'meteor':
        return this.meteor.cast({ ...call, skill, params: skillParams(skill, call.level) });
      case 'well':
        return this.well.cast({ ...call, skill, params: skillParams(skill, call.level) });
      case 'pebble':
        return this.pebble.cast({ ...call, skill, params: skillParams(skill, call.level) });
    }
  }
}
