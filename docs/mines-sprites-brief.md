# Brief: hand-drawn Crystal Mines sprites

Kenney has no 16px crystals, minecart, gate, goblin, beetle, mole, golem or stalactite in the Tiny Dungeon style
(see `docs/assets-mines.md`; the Roguelike Characters goblins are paper-doll layers and clash). Draw them in the style
of the existing hand-made sprites. Art only: do not wire them into game content, levels or `assetKeys.ts`. Never touch
`tilemap_packed.png`. Design: `docs/PROPOSAL-crystal-mines.md`.

## Read first
- `tools/add_sewer_frames.py` and `tools/add_monster_frames.py` (pattern: palette `COLOURS`, `parse()`, `mirrored()`,
  `outlined()`, one `main()` writing a strip), `tools/add_accessory_frames.py` (for the crown)
- `docs/assets-sewer/sewer-extra.png` and `docs/assets-sewer/tiny-dungeon.png` (style anchors)

## Style rules
- 16×16 tiles, transparent, top-down/three-quarter like Tiny Dungeon, 1px dark outline (`outlined()`), flat colours with
  one highlight and one shade, no anti-aliasing or gradients.
- Cave palette: dark slate, brown timber, with **crystal blue / violet / cyan** as the bright accent. Crystals must read
  as *glowing* against a dark floor (light core, saturated body, dark outline).
- Readable at ×3 for a child: eyes always visible; Nab must be instantly recognisable (green goblin, big ears, sack).

## Deliverable 1: `tools/add_mines_frames.py` → `public/assets/extra/mines-extra.png`
16px tiles, 12 per row, in this order:

| Frame | Sprite | Notes |
|---|---|---|
| 0 | Nab, idle | Small green goblin, big ears, grin, brown sack over shoulder |
| 1 | Nab, run | Mid-stride, sack bouncing |
| 2 | Nab, hit | Flinch, eyes squeezed, a gem popping out |
| 3 | Nab, wave | Head and arm only (poking out of the gate) |
| 4 | Goblin Miner | Bigger goblin, miner helmet with lamp |
| 5 | Goblin Miner, throw | Arm back |
| 6 | Pickaxe (projectile) | Horizontal, head right; game rotates/spins it |
| 7 | Hookjaw Spider | Dark, crystal-tipped legs, one big eye |
| 8 | Hookjaw Spider, rearing | Front legs up (aim telegraph) |
| 9 | Crystal Beetle | Shell of blue crystal plates, facing right |
| 10 | Crystal Beetle, shell glint | Same, front shell bright (blocking) |
| 11 | Rock Mole | Head and claws out of a hole |
| 12 | Dirt mound | Burrow telegraph |
| 13 | Shard Wisp | Floating crystal core, cyan glow |
| 14 | Shard Wisp, flicker | Second frame |
| 15 | Bert's Pebble | Round pebble with a happy face |
| 16 | Bert's Pebble, block | Squinting, a crack spark |
| 17 | Crystal cluster, blue | Floor decoration |
| 18 | Crystal cluster, violet | Floor decoration |
| 19 | Resonating crystal | Bigger, brighter cluster with rings (hazard) |
| 20 | Crystal pillar, top | Pillar is 16×32: frames 20 and 32 (directly below) |
| 21 | Crystal spike, small | Bert phase 3 regrowing spike |
| 22 | Stalactite | Seen from above: pointed rock with a drip |
| 23 | Minecart | Horizontal; game rotates for vertical rails |
| 24-26 | Magic gate | Three-frame violet swirl ring |
| 27 | Crystal Scepter | Wand with a big faceted crystal head |
| 28 | Scepter bolt | Small spinning shard |
| 29 | Stuck shard | Tiny crystal stuck to a monster (overlay) |
| 30 | Encased | Translucent-looking crystal block overlay (2-3 flat tones, no alpha gradient) |
| 31 | Shatter shard | Particle |
| 32 | Crystal pillar, bottom | Lower half of frame 20 |

## Deliverable 2: `public/assets/extra/bert.png` (same script, 32×32 frames)
| Frame | Sprite |
|---|---|
| 0 | Bert, body (no plates): chunky grey-blue rock golem, kind eyes, glowing heart crystal in the chest |
| 1 | Bert, angry body |
| 2-5 | Plate overlays: front, back, left, right, each a different colour (red, yellow, green, blue), drawn so they sit on frame 0 |
| 6 | Bert rolled into a ball |
| 7 | Bert stunned (eyes as spirals) |
| 8 | Happy little rocks pile (ending) |

## Deliverable 3: Crystal Crown
Add frame 5 to `accessories-extra.png` via `tools/add_accessory_frames.py` (append only; frames 0-4 must not change
pixel-for-pixel): a crown of blue/violet crystal points.

## Verify
1. `python tools/add_mines_frames.py` and `python tools/add_accessory_frames.py` run clean with Pillow only.
2. Contact sheets: `python tools/contact_sheet.py public/assets/extra/mines-extra.png docs/assets-mines/mines-extra.png 16 0 0 8`
   and the same for `bert.png` (tile 32, scale 4). Look at them and fix anything unclear; check a ×3 render beside
   Tiny Dungeon monsters for style.
3. Accessory frames 0-4 are unchanged (compare pixels).

## Report back
Final frame table, colours added, anything weak. Append the table as `## Hand-drawn mines sprites` to `docs/assets-mines.md`.
