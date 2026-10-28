# Brief: hand-drawn sewer sprites

Kenney has no 16px toad, gator, mushroom creature, big slime boss, javelin, glob or gas puff (see `docs/assets-sewer.md`).
Draw them in the style of the existing hand-made monsters. Art only: do not wire them into game content, levels or
`assetKeys.ts` (a later session does that). Do not run git commands (the coordinator commits). Never touch `tilemap_packed.png`.

## Read first
- `tools/add_monster_frames.py` (pattern to copy: palette `COLOURS`, `parse()`, `mirrored()`, `outlined()`, one `main()` writing a strip)
- `tools/add_weapon_frames.py` (for the javelin and any projectile art)
- `docs/assets-sewer.md` (stand-ins and style notes), `public/assets/tiny-dungeon/tilemap_packed.png` and `docs/assets-sewer/tiny-dungeon.png` (style anchor: frame 108 green slime, 109–124 monsters)

## Style rules
- 16×16 tiles, transparent background, top-down/three-quarter like Tiny Dungeon, 1px dark outline (reuse `outlined()` and `OUTLINE`), flat colours with one highlight and one shade, no anti-aliasing, no gradients.
- Dark sewer palette: murky greens, olive, brown, with one bright accent (eyes, spots, teeth) so a child can read threat and type at a glance. Reuse `COLOURS` letters where they fit and add new ones sparingly.
- Readable silhouettes at ×3 scale; eyes always visible; big enemies read as the small one scaled up with extra detail, not new shapes.

## Deliverables
Write a new generator `tools/add_sewer_frames.py` (do not edit the three existing scripts) that creates
`public/assets/extra/sewer-extra.png`, a strip of 16px tiles, 12 per row (extend to extra rows if more than 12 frames are needed), in this order:

| Frame | Sprite | Notes |
|---|---|---|
| 0 | Slime, small | Green blob, 2 eyes, glossy highlight; ~10px wide |
| 1 | Slime, small, squash | Same blob flattened (hop/idle animation frame 2) |
| 2 | Slime, big | 16×16 full-tile version of frame 0 with a drip or bubble; used at ×1 or scaled |
| 3 | Slime, big, squash | Squashed frame for animation |
| 4 | Slime boss | Distinct from frame 2: crown/helm-like crest or extra eyes, darker teal, bubbles inside the body. Drawn at 16×16; game scales it up ×3–4 |
| 5 | Slime boss, angry | Same body, angry brows / open mouth for phase 2 |
| 6 | Toad | Squat, wide, warty olive-brown, big yellow eyes; side/top-down, sitting |
| 7 | Toad, leaping | Legs extended for the jump telegraph/lunge |
| 8 | Gator | Long body drawn along the tile (16px wide), snout to the right, teeth visible; facing right (game flips) |
| 9 | Gator, jaws open | Same, mouth open (snap attack) |
| 10 | Mushroom creature | Red/cream-spotted cap with face and stubby legs; spore-spitter look |
| 11 | Mushroom creature, puffing | Cap tilted/open, small spore dots |
| 12 | Javelin | Diagonal-free horizontal spear, tip pointing right, wooden shaft, grey head; game rotates it |
| 13 | Glob (projectile) | Round green/brown splat blob with highlight; 8–10px |
| 14 | Splash | Burst of droplets, for glob impact; 3 pixel-ring shape |
| 15 | Gas puff | Soft pale-green cloud, dithered edges by hand (no alpha gradients: use 2–3 flat tones) |
| 16–17 | Gas puff, 2 more variants | Different shapes so they can be randomised or animated |

If a sprite doesn't fit in one tile or reads badly, say so and propose a 2×1 layout instead of squeezing it.

## Verify
1. `python tools/add_sewer_frames.py` runs clean with Pillow only.
2. `python tools/contact_sheet.py public/assets/extra/sewer-extra.png docs/assets-sewer/sewer-extra.png 16 0 0 8` makes a numbered contact sheet. Look at it, and fix anything that is unclear. Also check a ×3 render next to Tiny Dungeon frame 108 (slime) and 109–124 (monsters) for style match.
3. No other repo files change except the new script, the new PNG and the contact sheet.

## Report back
- Frame index to meaning table (final, in the same order), tile layout, and any colours added.
- Anything that looked weak or needs a second pass.
- Append that table as a `## Hand-drawn sewer sprites` section to `docs/assets-sewer.md`.
