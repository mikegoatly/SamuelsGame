export const CLEAN_DEPTH = { min: 8, max: 13 };

/**
 * RESERVED DEPTH BAND 8-13: player-side visuals only (hero 10, weapon 11, hat 12, slashes, rings, skill effects, bolts).
 * Nothing enemy-side may use it: monsters are 5-6, their particles 7, floor effects 4 and below, float text 25+.
 * Classes that are clean whatever their depth: Player, Projectile, Fireball, SpiritWolf.
 *
 * Player-side visuals (weapon, slashes, rings, skill effects, bolts) live in the depth band above monsters (5-6) and below the HUD-like layers (25+); that band stays free of the screen glitch. */
export const isCleanDepth = (depth: number): boolean => depth >= CLEAN_DEPTH.min && depth <= CLEAN_DEPTH.max;
