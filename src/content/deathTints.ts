/** Particle colour when each enemy dies. */
export const DEATH_TINTS: Record<string, number> = {
  slime: 0x6fd36f,
  bat: 0x9a6ad0,
  cyclops: 0xd89a50,
  spider: 0x8a6aa0,
  ghost: 0xa0e0ff,
  stoneGuardian: 0xa8a8b0,
  scorpion: 0xd8a040,
  bandit: 0xd05050,
  mummy: 0xd8c898,
  vulture: 0xb08060,
  sandWyrm: 0xd8b070,
  palaceGuard: 0x9ab4ff,
  royalArcher: 0xe0c060,
  darkMage: 0xc070ff,
  assassin: 0x7a6a9a,
  madKing: 0xffd060,
};

export const deathTint = (id: string, tint?: number): number => tint ?? DEATH_TINTS[id] ?? 0xd8d8e8;
