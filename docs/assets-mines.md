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
