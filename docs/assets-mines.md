# Crystal Mines assets

Survey of the Kenney pack (`KENNEY_DIR`) for the Crystal Mines (`docs/PROPOSAL-crystal-mines.md`). Read-only: nothing
copied, no source edited. Frame index = row × columns + column. Frames marked **(verify)** were read off a contact sheet at
low zoom; check them in game before wiring. Frame numbers from `docs/assets-sewer.md` are reused as-is (not re-checked).
Contact sheets for new sheets are in `docs/assets-mines/`.

**Verdict (coordinator):** almost everything that gives the mines their look is a gap, so the mines get a hand-drawn
sheet like the sewer did (`docs/mines-sprites-brief.md`). The Roguelike Characters goblins are paper-doll layers
(bodies + clothes) in a softer style and are not used. Kenney is used for: cave floor/walls (tinted), rails, lanterns,
timber, Tiny Dungeon bat, and sound effects. Only the sound effects and music need copying from OneDrive.

## Gaps (no good 16px match)

| Need | Closest stand-in |
|---|---|
| Crystal clusters (small and pillar-sized) | None. Hand-draw in `public/assets/extra/`. Tint grey cave rock blue/purple as a fallback. |
| Minecart | None. Hand-draw (tiny cart, 16px). |
| Magic gate / portal | None. Tiny Dungeon doors 9–11 or 21–23 with a tint; or hand-draw. |
| Crystal shards / shatter particles | None. Use `fx/skill-frost.png` (star_08) tinted blue. |
| Glow / beam look | None. Use `fx/skill-lightning.png` (spark_06) or `fx/star.png`, tinted. |
| Stalactites | None (Roguelike Dungeon 0–6 are stalagmites only). Hand-draw. |
| Crystal golem (Bert) | None. Tiny Dungeon cyclops (109) enlarged ×2–3, tinted grey-blue, or hand-draw. |
| Beetle | None. Tiny Dungeon scorpion (in 109–112, 120–124) tinted dark blue. |
| Mole | None. Hand-draw. |
| Wisp / spirit | Tiny Dungeon ghost (121, sewer doc) with a glow. |
| Goblin (Nab, Goblin Miner) | Roguelike Characters, green humanoids near frames 162–163 **(verify)**. |
| Gems | None at 16px. Roguelike Dungeon 448–450 (sack/ingots) or hand-draw. |
| Pebble friend | Roguelike Dungeon 62–65 (small pebble piles). |

The HD packs (New Platformer, Animal Pack Redux, Splat Pack, Generic Items, Smoke Particles) are a clear style clash with
the 16px Tiny Dungeon look. Use them only for reference.

## Matches

| Need | Pack / file | Frames | Notes | In repo? |
|---|---|---|---|---|
| Cave floor, rock | Roguelike Dungeon `sewer/roguelike-dungeon.png` | 8–15, 37–44 (stone floor); 0–6 (rock chunks) | Grey stone; tint dark blue-purple | Yes |
| Cave wall (Tiny Dungeon look) | Tiny Dungeon `tiny-dungeon/tilemap_packed.png` | 4–6, 16–18 (stone edges) | Style anchor | Yes |
| Rails, ladders, planks | Tiny Dungeon | 67–83 | From sewer doc; rails for the minecart track | Yes |
| Timber supports | Roguelike Interior `docs/assets-mines/roguelike-interior.png` | 220–223 (wood beams), 170–177 (wood frames) | Not copied yet | No |
| Lantern / torch | Roguelike Dungeon | 506–508 (brazier/lantern) | From sewer doc | Yes |
| Torch / candles | Roguelike Interior | 182, 205–208 (candles), 209–211 (braziers with flame) | Not copied yet | No |
| Pickaxe | Roguelike Dungeon | 416–421 (bones/pickaxe decals) | From sewer doc | Yes |
| Crystal scepter | Tiny Dungeon | 117–119 (wands) | Tint blue, add a gem (hand-drawn) | Yes |
| Bat | Tiny Dungeon | in 109–112, 120–124 (monsters) | Frame not pinned down | Yes |
| Spider | Tiny Dungeon | in 109–112, 120–124 | Frame not pinned down; Hookjaw uses silk line (hand-draw) | Yes |
| Small monsters (grey, tintable) | Monochrome RPG Tileset `docs/assets-mines/monochrome-rpg.png` | 119–124 **(verify)** | 1-bit grey; tint for goblin/beetle | No |
| Goblin humanoids | Roguelike Characters `docs/assets-mines/roguelike-characters.png` | 162–163 (green), 6–17 and 114–125 (robed/armoured figures) **(verify)** | 16px, 1px spacing | No |
| Mine floor (alt) | One-bit Pack `docs/assets-mines/one-bit-legacy.png` | 40–49 (grey floor) **(verify)** | 1-bit; hard to read at small size | No |

Not useful: Topdown Shooter (Pixel) for mines art (grass, bushes, sand; rubble 324–328, 360–363 is too faint);
Micro Roguelike (8px tiles, clashes); Pixel Platformer Blocks (18px); Pixel Platformer Industrial (18px).

## Sound effects (under `C:/Users/mikeg/OneDrive/Documents/Graphics/Kenney Game Assets All-in-1 3.0.0/Audio`)

Not auditioned. Chosen by name and family.

| Need | File(s) | Notes |
|---|---|---|
| Minecart rumble / rattle | `Retro Sounds 1/Audio/rumble*.ogg` (check which number) | Not copied |
| Crystal chime / ring | `Impact Sounds/Audio/impactBell_heavy_000–004.ogg` | Bell; may be too heavy |
| Crystal shatter / glass | `Impact Sounds/Audio/impactGlass_heavy_000–002.ogg` | Good match for shatter |
| Rock crumble | `Foley Sounds/Audio/Rocks/stoneHit1–5.ogg`, `stonesHit1–2.ogg` | Good match |
| Portal open / close | `Sci-Fi Sounds/Audio/forceField_000.ogg` (open), `forceField_004.ogg` (close) | Already copied as `fireball_1` / `shieldbreak_0` |
| Goblin giggle / squeak | `Retro Sounds 1/Audio/creature1–2.ogg` | Already copied as `croak_0/1` |
| Whip / web "thwip" | `Foley Sounds/Audio/Woosh/woosh1–8.ogg` | Short and fast |
| Bat / spider | none exact | Use `Retro Sounds 1` creature variants |
| Gem pickup | `RPG Audio/Audio/handleCoins*.ogg` | Already copied as `coin_0/1` |

Licences: `Foley-License.txt`, `Retro1-License.txt`, `RPG-License.txt`, `Impact Sounds/License.txt`, all CC0.

## Sheets to copy (none copied yet)

| Source (under the Kenney 2D assets folder) | Proposed destination | Grid | Margin | Spacing |
|---|---|---|---|---|
| `Roguelike Characters Pack/Spritesheet/roguelikeChar_transparent.png` | `public/assets/mines/roguelike-characters.png` | 54×12 (648) | 0 | 1 |
| `Roguelike Interior Pack/Tilesheets/roguelikeIndoor_transparent.png` | `public/assets/mines/roguelike-interior.png` | 27×18 (486) | 0 | 1 |
| `Monochrome RPG Tileset/Default/Tilemap/tilemap_packed.png` | `public/assets/mines/monochrome-rpg.png` | 17×8 (136) | 0 | 0 |

Optional: the Tiny Dungeon-style `Topdown Shooter (Pixel)` and `One-bit Pack` sheets are not recommended.
Licences: each pack has its own `License.txt` (CC0).

## Contact sheets

`docs/assets-mines/`: `roguelike-characters.png`, `roguelike-interior.png`, `monochrome-rpg.png`, `one-bit-legacy.png`,
`topdown-shooter.png`.

## Hand-drawn mines sprites

Drawn by `tools/add_mines_frames.py` (Pillow only). Contact sheets: `docs/assets-mines/mines-extra.png`,
`docs/assets-mines/bert.png`, `docs/assets-mines/accessories-extra.png`. Not wired into `assetKeys.ts` yet.

`public/assets/extra/mines-extra.png`: 16px frames, 12 per row (192×48).

| Frame | Sprite | Notes |
|---|---|---|
| 0 | Nab, idle | Green goblin, big ears, grin, maroon tunic, brown sack on his right |
| 1 | Nab, run | Head up 1px, mid-stride, sack lifted |
| 2 | Nab, hit | Eyes squeezed, open mouth, blue gem popping out top-right |
| 3 | Nab, wave | Head and raised arm only; bottom 4 rows empty for the gate to cover |
| 4 | Goblin Miner | Darker goblin, yellow helmet with lamp, grey overalls, fangs |
| 5 | Goblin Miner, throw | Pickaxe raised behind his head on the left |
| 6 | Pickaxe (projectile) | Horizontal, head on the right |
| 7 | Hookjaw Spider | One big eye, crystal-tipped legs, hooked fangs |
| 8 | Hookjaw Spider, rearing | Front legs up, red pupil (aim telegraph) |
| 9 | Crystal Beetle | Blue crystal plates, head and eye on the right (faces right) |
| 10 | Crystal Beetle, glint | Front plates bright white (blocking) |
| 11 | Rock Mole | Head and claws out of a dark hole |
| 12 | Dirt mound | Burrow telegraph |
| 13 | Shard Wisp | Cyan crystal core with eyes, orbiting shards |
| 14 | Shard Wisp, flicker | Shards in other positions |
| 15 | Bert's Pebble | Round grey pebble, happy face |
| 16 | Bert's Pebble, block | Squinting, yellow crack line and spark on the right |
| 17 | Crystal cluster, blue | Floor decoration on a slate base |
| 18 | Crystal cluster, violet | Mirror of 17, violet |
| 19 | Resonating crystal | Bright blue cluster with cyan rings (rings have no outline) |
| 20 | Crystal pillar, top | Upper half of a 16×32 pillar; frame 32 is directly below |
| 21 | Crystal spike, small | Violet, Bert phase 3 |
| 22 | Stalactite | Pointed slate rock with a blue drip |
| 23 | Minecart | Timber cart with metal rim, crystals inside, two wheels; horizontal |
| 24-26 | Magic gate | Violet swirl ring, white centre; play 24→25→26 |
| 27 | Crystal Scepter | Vertical like the other weapons, faceted crystal head on top |
| 28 | Scepter bolt | Small shard with sparkles |
| 29 | Stuck shard | Tiny crystal overlay |
| 30 | Encased | Opaque light-blue block with facet lines; draw it with alpha (~0.6) for a see-through look |
| 31 | Shatter shard | Particle |
| 32 | Crystal pillar, bottom | Lower half, slate base |

`public/assets/extra/bert.png`: 32px frames, one row (288×32).

| Frame | Sprite | Notes |
|---|---|---|
| 0 | Bert | Grey-blue rock golem, kind eyes, smile, glowing blue heart crystal |
| 1 | Bert, angry | Slanted brows, red eye glints, frown |
| 2 | Plate: front (red) | Belly shield below the heart |
| 3 | Plate: back (yellow) | Spiky crest; only the parts that show around his head and shoulders are drawn, so it reads as behind him |
| 4 | Plate: left (green) | Screen-left shoulder (Bert's right) |
| 5 | Plate: right (blue) | Screen-right shoulder (Bert's left) |
| 6 | Bert rolled up | Boulder ball, heart crystal glinting |
| 7 | Bert stunned | Spiral eyes, wobbly mouth, dizzy stars |
| 8 | Happy little rocks | Six smiling pebbles in a pile (ending) |

Plates 2-5 are drawn in the same 32×32 space as frame 0, so place them at the same position as Bert.

`public/assets/extra/accessories-extra.png` frame **5**: Crystal Crown (blue/violet crystal points, violet band). Frames 0-4
are unchanged.

Colours added to the shared letter palette (in `add_mines_frames.py`): goblin green `g/G/e`, crystal blue
`C/c/N` + core `W`, violet `V/v/P`, cyan `q/Q/u`, spider `K/H`, mole fur `f/F`, golem rock `t/L/T`, green plate
`j/J/i`, plate highlights `R` (red) and `A` (yellow), dark yellow `Y`, dark slate `z`. Crown: `C` light blue and `v`
light violet.
