import { GlitchFrame, Tex } from './assetKeys';
import type { EnemyDef } from './enemies';

/**
 * Glitch's boss: a big magenta/black checker cube that copies the moves (and colours) of the Stone Guardian, the Sand Rat and the Mad King in turn
 * (src/logic/missingTexture.ts). Its own stats cover every copied attack: slam, bolt and lunge damage come from here.
 */
export const missingTexture: EnemyDef = {
  id: 'missingTexture',
  name: 'Missing Texture',
  frame: 0,
  texture: Tex.glitch,
  textureFrame: GlitchFrame.bossIdle,
  baseHp: 1500,
  baseDamage: 16,
  speed: 36,
  behaviour: 'boss',
  lootTableId: 'madKing',
  scale: 3,
  boss: true,
  brain: { phaseTwoAt: 0, phases: { 1: { speedMultiplier: 1, attacks: [] }, 2: { speedMultiplier: 1, attacks: [] } } },
  slamDamage: 20,
  boltDamage: 10,
  boltSpeed: 88,
  barTicks: [0.5, 0.2],
  tip: 'It copies other bosses! Watch which one it is.',
};
