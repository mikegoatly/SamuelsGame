# Proposal: The Crystal Mines (second hidden level), Nab and Bert

Status: **C1 built** (2026-10-29); C2 next

Decided by the user: endgame tier; Nab on Desert/Palace from Lv 11; Hookjaw Spider instead of a Gem Mimic;
Crystal Scepter is Nab's signature weapon and only Nab's; Bert's Pebble is the normal-clear reward, as a skill;
Bert gets the gentle ending.

An endgame secret: harder than the Mad King, found by chasing a gem thief, with a boss you beat by making him crash.

## 1. Finding it: Nab the thief

1. **Where:** random Desert and Palace maps only, and only when the hero is **Lv 11 or higher** (a Lv 7 player can
   never stumble into it). Never on the classic `.tmj` maps.
2. **When:** as a combat room is cleared, Nab sometimes runs in and starts **pocketing coins off the floor**.
   He never attacks.
3. **Chase:** each hit makes him drop a gem (so a failed chase still pays) and run faster.
4. **Third hit:** he panics, smashes a crystal and a **magic gate** opens where he stands. He jumps through, then
   pokes his head out and waves.
5. **The gate** stays open about **8s**: a big shrinking ring around it, an off-screen arrow pointing to it. Reaching
   it opens a `MenuList` prompt (pauses): *"Follow Nab into the mines?"* — **Follow** / **Not now**.
   - **Follow** ends the run like a quit (gold banked) and starts the mines on Normal, same hero and loadout.
   - Either answer: "Crystal Mines discovered!" notice, mines card appears, **Nab unlocks** (via `heroReveal`).
   - "Not now" closes the gate, but the mines are found, so nothing is lost.
6. **Missed it:** "Too slow!", gate closes, nothing found. He may turn up again next run.
7. **How often:** while undiscovered, an eligible run has Nab about **40%** of the time; **pity:** after 3 eligible
   runs without him, the next one has him for sure (same shape as `logic/grate.ts`). After discovery he still
   appears sometimes (20%) as a shortcut and a gem piñata.
8. Completely hidden until found: no card, no hint (same rule as the sewer). `?debug=nab` forces him (DEV only).

## 2. The level: Crystal Mines

- **Tier: endgame.** Monster levels **13-16**, recommended level 14; Bert is **Lv 17** (the Mad King is Lv 15).
  Heroic version and crown like other levels; never required for Heroic Survival.
- **Look:** cave tiles tinted deep blue/purple, glowing crystal clusters, rails and timber supports. Darkness is
  faked with a vignette and glowing props (a real light mask is too costly on phones); vignette goes through `feel`.
- **Layout:** six combat rooms + boss cavern via `tools/mapThemes.ts` (`MINES_THEME`), with rail lines crossing rooms.

### Hazards

- **Minecarts (signature):** a rail glows and rumbles (~1.2s telegraph, warning arrow at the rail end), then a cart
  rattles through. Hurts the player *and* monsters, so luring monsters onto rails is a tactic.
- **Resonating crystals:** hit one and it rings, then a shockwave that **only hurts monsters** (a tool, not a trap).
- **Stalactites:** reuse rubble (shadow, then drop).

### Monsters (one new one per room)

| # | Monster | Trick | Likely reuse |
|---|---|---|---|
| 1 | **Cave Bats** | Wobbly swarm | rat swarm |
| 2 | **Goblin Miner** | Throws a pickaxe that boomerangs back | `logic/boomerang.ts` |
| 3 | **Crystal Beetle** | Shell blocks frontal shots; hit it from the side or behind | Mirror Knight shield |
| 4 | **Rock Mole** | Burrows, pops up under you (dirt-mound telegraph) | shark / gator lurk |
| 5 | **Shard Wisp** | Bursts into a ring of shards on death: kill it from range | death burst |
| 6 | **Hookjaw Spider** | Grabs you with a silk line and reels you in for a bite | new |

**Hookjaw Spider** in detail (kept fair for a child):
- Rears up and aims a thin dotted line at you for ~0.8s; the aim **locks 0.3s before it fires**, so stepping aside
  dodges it.
- If it hits, you're tethered and pulled towards the spider over ~0.6s, then it bites (its normal contact damage).
- **Break free:** dash, or hit the spider during the pull. 4s cooldown per spider and **only one tether on the player
  at a time** (no being passed between spiders).
- Pull uses the existing push hooks (`Player.windPush`), stops instantly on run end / player death / `feel.isLocked`.

## 3. Bert the Crystal Golem

The fight's idea: **you make Bert crash.** Round cavern with 4 big crystal pillars.

- **Phase 1 — armoured (100-60%):** four coloured crystal plates (front, back, left, right). A plated side takes
  reduced damage, a bare side full. Each plate knocked off makes him lighter and faster (debris flies off).
  Attacks: **ground pound** (growing ring), **crystal toss** (landing circle).
- **Phase 2 — rolling (60-25%):** curls into a ball; a big arrow shows his line, then he charges and bounces off
  walls. If he **hits a pillar**, it shatters and Bert is **stunned 3s** (dizzy stars): the big damage window.
  Lesson: stand in front of a pillar, dodge late.
- **Phase 3 — laser (<25%, pillars gone):** a **bouncing laser** off the cavern walls, the bounce path drawn as a thin
  line first. Small crystal spikes keep regrowing as new things to crash him into.
- **Ending:** Bert crumbles into a pile of happy little rocks; Nab sheepishly hands back Bert's heart crystal
  (one line on the results screen; a special line if you're playing as Nab).
- **New code:** plate facing rules, roll/bounce/collision and the laser bounce path as pure logic
  (`logic/bertPlates.ts`, `logic/bertRoll.ts`, `logic/bounceRay.ts`); attacks plug into `bossBrain`.

## 4. Nab the hero

- Gem-thief goblin. **Low HP / high speed / mid attack.**
- **Passive — Snatch:** dashing *through* a monster steals a coin from it (once per monster), and his dash is a bit
  longer. Rewards bold dashing; different from the dwarf's flat gold bonus.
- **Signature weapon: the Crystal Scepter** (stolen, of course).

## 5. Crystal Scepter (Nab's signature weapon)

- Each bolt puts a **crystal shard** on the monster it hits (shown as little crystals stuck to it).
- At **4 shards** the monster is **encased** in crystal: frozen 1.5s (bosses are only slowed).
- The next hit **shatters** it: bonus damage plus shards flying out that each add a shard to nearby monsters, so
  crowds chain-react.
- **Level 5 twist:** shatter shards can encase on their own.
- Shards fade if a monster isn't hit for a few seconds. Upgrade info: blue gems; tier and DPS bands set by
  `docs/BALANCE-weapons.md` measurements. **Nab only** (not in camp or Loadout for other heroes).

## 6. Bert's Pebble (normal-clear reward)

A **skill**: a little rock friend that orbits you for a while and **blocks one enemy shot every few seconds**
(flashes and wobbles when it does). Equipped and upgraded like the other skills.
Heroic first clear: gems + the **Crystal Crown** (head accessory).

## 7. Open questions

1. ~~What is the Pebble, mechanically?~~ **Decided (2026-10-29): a skill** ("Bert's Pebble", loadout slot,
   cooldown, upgrades with gems like other skills). Using it brings the Pebble out to orbit you for a while.
2. ~~Scepter for other heroes?~~ **Decided: Nab only** for now (could become buyable later).
3. ~~Bert's ending scene?~~ **Decided: yes**, the gentle "happy little rocks" ending.

## 8. Build notes and phases

- Save bump with tolerant migration + tests: `secrets.minesFound`, `secrets.nabPity`, hero id `nab`.
- Pure logic in `src/logic`: Nab appearance chance + pity, gate timer, scepter shards/encase/shatter, spider tether,
  minecart cycle, Bert rules. Tests first.
- Music (user, 2026-10-29): **Synth** → `music/mines.mp3` (copied). Bert uses the standard boss track unless a
  better one is picked later. Sound effects copied as `rumble`, `chime`, `crystalhit`, `shatter`, `crumble`, `roll`,
  `thwip` (`audio/<id>_N.ogg`; see `docs/assets-mines.md`), not yet registered in `sfxDefs.ts` or `assetKeys.ts`.
- Art: hand-drawn sheet per `docs/mines-sprites-brief.md`. Check the Kenney packs for cave/crystal tiles, bats, spider, goblin; generate the rest into
  `public/assets/extra/` (e.g. `mines-extra.png`). Never edit `tilemap_packed.png`.
- Balance: mines bands in `tests/balanceModel.test.ts` above the palace.

| Phase | Scope |
|---|---|
| **C1** | Nab chase, gate, prompt, discovery, Nab hero + Snatch + Crystal Scepter, stub mines card, save bump |
| **C2** | Mines map + theme, hazards (minecarts, resonating crystals, stalactites), six monsters |
| **C3** | Bert, Bert's Pebble, Heroic + Crystal Crown, balance pass |

C1 splits across two builders: discovery (Nab NPC, gate, save) vs hero (Snatch, Scepter).

## 9. Made during C1 build

- Nab comes as one of the **first four** combat rooms clears (random), so a run that falls early still had its chance.
- **Pity** counts fresh eligible runs that reach a room without him, and resets only when he actually turns up.
- Hits within **350ms** are one hit (a pierce, a cone or a skill burst cannot open the gate at once). Ally bites, DoTs,
  slows, stuns and Scepter shards never count. Left alone for **20s** he slips away ("Nab got away!").
- He walks at 62 px/s, +18 per hit (still slower than a dash after two hits). Each of the three hits drops a random gem.
- The mines are a **coming-soon stub**: Follow banks the run and opens Level Select on the mines card (as the sewer did in S1).
- The grate prompt became a shared **`SecretPrompt`** (sewer or mines text). `hiddenUntilFound` now names its secret.
- **Scepter numbers:** 8 per 280ms, range 230; shatter +2x the bolt; up to 4 spray shards within 56px; shards fade after 3s.
  Spray shards never shatter, and without the level 5 twist they stop at 3 shards. Tier 2, blue gems.
- **Snatch:** 1 coin (2 gold) per monster; the dash lasts 1.3x as long.
- `?debug=mines` lists the card without finding it (like `?debug=sewer`).
