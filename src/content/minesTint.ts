/** Layer tints that pull the Tiny Dungeon sheet toward deep blue-violet cave (multiplied over the art), and the glow colours of the mines' props. */
export const MINES_TINT = { ground: 0x5a6cd8, walls: 0x403c86, decor: 0x9ab0ff, rail: 0x9a7a52, railGlow: 0xffc860, glowBlue: 0x66aaff, glowViolet: 0xb070ff } as const;

/** Texture keys of the two radial gradients baked once at runtime: a white soft glow for crystals and a black-edged vignette for the cave darkness. */
export const MINES_TEXTURE = { glow: 'mines-glow', dark: 'mines-dark' } as const;
