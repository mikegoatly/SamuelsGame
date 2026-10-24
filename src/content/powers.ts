import { Frame } from './assetKeys';

export interface PowerDef {
  id: string;
  name: string;
  /** Tiny Dungeon frame used for the reward pickup and the HUD icon. */
  frame: number;
  tint: number;
}

export const fireball: PowerDef = { id: 'fireball', name: 'Fireball', frame: Frame.wand, tint: 0xff7a2a };

export const powers: Record<string, PowerDef> = { fireball };
