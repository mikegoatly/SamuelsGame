/** Glitch-sheet frames 6-9 (public/assets/extra/glitch-extra.png) are copied into the tile sheet at load, after the Glitcher (tile frame 150), so weapons are drawn like every other one from Tex.tiles. */
export const GLITCH_WEAPON_SOURCE_FRAMES: readonly number[] = [6, 7, 8, 9];

/** Tile-sheet frames, in the same order as GLITCH_WEAPON_SOURCE_FRAMES. */
export const GlitchWeaponTile = { pixelPulse: 151, pixelPulseBolt: 152, glitchGun: 153, glitchGunBolt: 154 } as const;
