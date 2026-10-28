# Sewer level assets

Survey of the Kenney pack (`KENNEY_DIR`) for a sewer level in the Tiny Dungeon style. Everything below was copied by
`tools/copy-assets.ts` (`npm run copy-assets`); licences sit next to each file. `tilemap_packed.png` (Tiny Dungeon) is untouched.
Numbered contact sheets (upscaled, index = row × columns + column, i.e. Phaser frame index) are in `docs/assets-sewer/`;
regenerate with `python tools/contact_sheet.py <sheet> <out> <tile> <margin> <spacing> <scale>`.

## What Kenney does NOT have (gaps)

No 16px Tiny-Dungeon-style **toad, gator, mushroom creature, big slime boss, javelin, glob/splash** or **gas puff** exists in the
pack, and there are no sewer **wall pipes, drains or puddles** as such. The only slimes/frogs/crocodiles are in the HD
`New Platformer Pack` / `Animal Pack Redux` (64px+ vector-ish art), which clashes. Proposed fill, following `tools/add_monster_frames.py`
(hand-drawn pixel frames in `public/assets/extra/`): draw toad, gator, mushroom-man, javelin, glob and gas puff there. Closest stand-ins today:

| Need | Stand-in |
|---|---|
| Slime (small) | Tiny Dungeon 108 (green blob), 1× scale |
| Slime (big) / slime boss | Tiny Dungeon 108 at ×2 / ×3 scale (+ tint, + 121 ghost-eyed variant); needs hand-drawn art to be convincing |
| Mushroom (prop) | Roguelike Dungeon 87–90, 116–119; Tiny Town 29 |
| Javelin | Tiny Dungeon 131 (spear tip), 103/104 (daggers); Tiny Town 119 (arrow) |
| Glob / splash | `fx/skill-poison.png` (smoke_08, already copied) tinted green; Particle Pack `splat`-like shapes are not 16px |
| Gas puff | `fx/smoke.png` / `fx/skill-poison.png` tinted sickly green |
| Wall pipe / drain / spout | Tiny Dungeon 7, 8 (grate with green drip), 19, 20 (faces), 31, 32, 43, 44 (basins, 32/44 green flow) |
| Puddle | Roguelike Dungeon 62–65 (small dirt/pebble piles) are *not* puddles; use water fill 291/320 cut to a half-alpha overlay or hand-draw |

The Roguelike sheets are lighter and softer than Tiny Dungeon (no heavy dark outline). Tint grey tiles dark blue-green in-game
(`EnvironmentTint`) to read as sewer; Tiny Dungeon stays the style anchor for walls.

## Sheets

All 16×16 tiles, transparent PNG, frame index = row × columns + column.

| Path (under `public/assets/`) | Size | Grid | Margin | Spacing | Source pack |
|---|---|---|---|---|---|
| `tiny-dungeon/tilemap_packed.png` (existing) | 192×176 | 12×11 = 132 | 0 | 0 | Tiny Dungeon |
| `sewer/tiny-town.png` | 192×176 | 12×11 = 132 | 0 | 0 | Tiny Town |
| `sewer/tiny-battle.png` | 288×176 | 18×11 = 198 | 0 | 0 | Tiny Battle |
| `sewer/roguelike-dungeon.png` | 492×305 | 29×18 = 522 | 0 | 1 | Roguelike Dungeon Pack |
| `sewer/roguelike-base.png` | 968×526 | 57×31 = 1767 | 0 | 1 | Roguelike Base Pack |

Phaser: `load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1 })` for the two Roguelike sheets.
Contact sheets: `docs/assets-sewer/{tiny-dungeon,tiny-town,tiny-battle,roguelike-dungeon,roguelike-base}.png`.
Licences: all CC0 (`sewer/*-License.txt`, `tiny-dungeon/License.txt`).

## Frame meanings

### Tiny Dungeon — `tiny-dungeon/tilemap_packed.png`
| Frames | Meaning |
|---|---|
| 0–3, 12–13, 24–27 | Dark brown ground / rubble, floor with stone frame pieces |
| 4–6, 16–18, 28 | Stone wall corners/edges, brick wall face (28 dark brick with windows) |
| 7, 8 | Wall grate spout (8 with green drip) – **wall pipe / drain** |
| 19, 20, 31, 32, 43, 44 | Gargoyle faces and basins; 32, 44 have green flow – **drain** |
| 9–11, 21–23, 33–35, 45–47 | Doors / doorways |
| 29, 41 | Banner, spiked trap |
| 30, 42, 48–56 | Sand floor tiles (tintable) |
| 57–59 | Grey brick wall blocks |
| 36–40 | Stone wall strips |
| 67–83, 93–95 | Rails / ladders / planks / barrel (wood plank pieces usable as **bridge**) |
| 84–88, 96–100 | Heroes and NPCs |
| 108 | Green slime |
| 109–112, 120–124 | Monsters (cyclops, red demon, hooded, bat, ghost, spider, scorpion, dragon-head) |
| 113–116 | Potions |
| 103–107, 117–119, 125–131 | Swords, axes, wands, spear (131) |

### Tiny Town — `sewer/tiny-town.png`
| Frames | Meaning |
|---|---|
| 0–2, 12–14, 24–26, 36–42 | Grass and dirt ground with edges |
| 3–11, 15–35 | Trees and bushes |
| 29 | Red mushrooms |
| 43 | Cobble path |
| 44–59, 68–71, 80–82 | Wood fences and posts (plank bridge pieces) |
| 48–67 | Roof tiles |
| 72–79 | Stone/wood building walls and arches |
| 111–114, 123–126 | Dark stone arches / sewer-mouth looks; 125 grate door |

### Tiny Battle — `sewer/tiny-battle.png`
| Frames | Meaning |
|---|---|
| 3–4, 18–22, 36–39, 54–57, 72–75, 90–93 | Pond/river water with grass shore (blue; tint green for sludge), 38–39/57/75/93 vertical channel |
| 40–43, 58–60, 76–78 | Blue arrows / loop (UI, not terrain) |
| 108–111, 126–129, 144–147, 162–165 | Grey road / runway (stone floor with markings) |
| 130, 148, 166 | Road ending into water (bridge-like) |

### Roguelike Dungeon — `sewer/roguelike-dungeon.png` (29 columns)
| Frames | Meaning |
|---|---|
| 0–6, 29–35 | Rock chunks / stalagmites, plain and mossy (**moss decoration**: 1, 2, 4, 6, 30, 31, 33, 35) |
| 7, 36 | Floor cracks (dark overlay decal) |
| 8–15, 37–44 | Grey stone floor with border (room tiles) |
| 16–20, 74–78, 103–107, 132–136 | Grey **brick wall** faces with top highlight (135 broken) |
| 45–49 | Wall breaks / openings |
| 58–61 | Skull, bone, skeleton (decals) |
| 62–65 | Small dirt/pebble piles |
| 66–69, 95–102, 124–127 | Plain and cracked/stained grey floor (95/99 dark stain) |
| 70–73, 128–131 | Grey floor with wooden frame/arch posts |
| 87–90, 116–119 | **Mushrooms** (cream, red/orange, brown, small) |
| 91–94, 120–123 | Green vines, wood posts |
| 145–148, 174–177 | Stone pillar tiles |
| 150–152, 179–181 | Wooden crates/cupboards |
| 153–165, 182–194, 211–223, 240–252, 269–281 | Brown wood/dirt floor and walls (ruins palette) |
| 203–206, 232–235, 261–264 | Iron bars / **grate** (233, 235 broken, 262/264 with rail) |
| 207–210, 236–239, 265–268 | Wooden arch/doorframe pieces |
| 290–292, 319–321, 348–350, 377–379 | **Water pool** with stone rim: TL/T/TR, left/fill/right, bottom-left… (cyan) |
| 293–294, 322–323, 351–352, 380–381 | Cyan pool inner corners (stone corner bits) |
| 295–297, 324–326, 353–355, 382–384 | **Sludge pool** with stone rim (green-teal), same layout |
| 298–299, 327–328, 356–357, 385–386 | Green-teal pool inner corners |
| 300–305, 329–334, 358–363, 387–392 | Dust / spark / powder particles on grey, brown, dark grounds |
| 406–410, 435–439, 464–468, 493–497 | **Cyan flowing channel / waterfall**; the four rows are four animation frames (rows 406, 435, 464, 493); 438, 443, 467, 472 are rocks in the flow |
| 411–415, 440–444, 469–473, 498–502 | **Green-teal flowing sludge channel**, same four-row animation |
| 416–421 | Bones / pickaxe decals |
| 445–447, 474–476, 503–505 | Wooden **bridge** planks, cross-beams, railings and rope-bridge posts |
| 448–450, 477–479 | Misc items (sack, ingots) |
| 506–508 | Brazier / lantern |
| 306–310, 335–339, 480–484, 509–513 | Plain grey floor variants |
| 364–368, 393–397 | Brown floor variants; 422–426, 451–455 sand floor |

### Roguelike Base — `sewer/roguelike-base.png` (57 columns, only terrain parts used)
| Frames | Meaning |
|---|---|
| 0–1, 57–58, 114–115, 171–172, 228–229 | Cyan water fill (variants); 58 with a ripple/island |
| 2–4, 59–61, 116–118 | Pond with grass/dirt rim (TL/T/TR, row 2 middle, bottom) |
| 173–175, 230–232, 287–289 | Water pond with **stone rim** (3×3: corners and edges) |
| 5–9, 62–66 | Grass, dirt, grey stone, sand ground |
| 404–408, 461–465, 518–522, 575–579, 632–636, 689–692 | Dirt patch autotile (rounded edges) |
| 746–750, 803–807, 860–864, 917–921, 974–978, 1031–1034 | Grey stone patch autotile (rounded edges) – wet-stone floor |
| 409–411, 466–468, 523–525, 580–582, 637–639 | Teal/green framed pool tiles (sludge) |
| 855–859, 912–916, 971–973 | Green grass / bush autotile (moss-like when tinted) |
| 119–123, 176–180, 233–237, 290–294 | Brown brick/stone floor patterns |

(Other regions of this sheet — buildings, furniture, trees, UI — are not needed for the sewer; see the contact sheet.)

## Fonts

All 16 Kenney `.ttf` files copied to `public/assets/fonts/` as `Kenney<Name>.ttf` (Blocks, Bold, Future, FutureNarrow,
FutureSquare, High, HighSquare, Mini, MiniSquare, MiniSquareMono, Pixel (existing, `KenneyPixel.ttf`), PixelSquare, Rocket,
RocketSquare, Space, Thick). The Fonts pack has no licence file of its own; `fonts/License.txt` is the Tiny Dungeon CC0 text
(Kenney packs are all CC0). Remember: Kenney Pixel only renders crisply at multiples of 16px; check the others before use.

## Sound effects (`public/assets/audio/`)

None of these are exact matches by name; chosen by closest source family. **Not auditioned** — listen before wiring.

| Need | Files | Source |
|---|---|---|
| splash | `splash_0/1.ogg` | Foley Sounds / Water / sinkWater1–2 |
| gurgle | `gurgle_0/1.ogg` | Foley Sounds / Water / sinkWater3–4 |
| drip (bonus) | `drip_0/1.ogg` | Foley Sounds / Water / drip1–2 |
| squelch | `squelch_0/1.ogg` | Impact Sounds / impactSoft_heavy_000–001 (alt: Sci-Fi `slime_000/001`, already `poison_*`) |
| croak | `croak_0/1.ogg` | Retro Sounds 1 / creature1–2 (no real croak in the pack) |
| snap | `snap_0/1.ogg` | RPG Audio / chop; Impact Sounds / impactWood_light_000 |

Licences: `audio/Foley-License.txt`, `Retro1-License.txt`, `RPG-License.txt`, `License.txt` (Impact). All CC0.

## Music suggestions (music pack, **not copied**, not auditioned — picked by title; unused by existing levels)

Currently used: Relaxing Melody, Complicated Melody, Arpeggio, Fight, Montage, Hard Rock.

- Sewer: **Soothing Melodic Ambience** (murky, calm), **Harmonics**, **Idle**.
- Sewer boss: **Rock 2**, **Hard**, **Soothing Hard Rock** (heavier but less bright than Fight).

Preview these before choosing; copy later by adding to `music` in `tools/copy-assets.ts`.
