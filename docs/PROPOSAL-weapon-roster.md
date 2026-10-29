# Proposal — weapon roster and tiers

Status: **approved 2026-10-29, built (v0.20.0).** Follows on from `docs/BALANCE-weapons.md`, where the sword and hammer were
reined in and every melee swing now swats only one bolt.

## Problems

1. **One flat parity band is the wrong goal.** Starter weapons should be weak, and boss rewards should feel like a
   reward. Today the weapon test asks every weapon to be within ±25% of the Broken Wand.
2. **The Golden Sword is both the Mad King's reward (palace) and Sir Brandt's own weapon.** Sir Brandt unlocks by
   clearing a level without skills, so the final boss's prize can arrive early and then means nothing when it drops.
3. **The Sludge Slinger is a hidden-boss reward but plays weak:** 15 damage every 600ms = 25 DPS against the wand's
   40 (1.84× the wand's room damage).
4. **The Wizard and the Necromancer share the Apprentice Staff,** so Morwen has no weapon identity of her own.

## 1. Tiers drive the balance test

Every weapon already has a tier in `src/content/upgradeInfo.ts`, which also sets upgrade cost. The weapon test
(`tests/weaponBalance.test.ts`) switches from one band to one band per tier, measured against the Broken Wand at
level 1 (the model stays calibrated on the wand):

| tier | role | room damage vs wand | clear time vs wand | extra rule |
|---|---|---|---|---|
| 1 | starter | 1.5 – 3.5 | 1.3 – 2.5 | at upgrade level 5, within 1.4 of the wand |
| 2 | hero signature, mid-game | 0.75 – 1.25 | 0.75 – 1.25 | — |
| 3 | boss / level reward | 0.55 – 0.85 | 0.6 – 0.9 | must beat every tier 2 weapon on room damage |

Rule of thumb: **a hero's own weapon is tier 2, and a weapon won from a boss is tier 3.**

The tiers move to match that:

| weapon | how you get it | tier now | proposed | measured now (dmg / clear) |
|---|---|---|---|---|
| Apprentice Staff | Wizard, start | 1 | 1 | 3.10 / 2.02 — fits tier 1 |
| Broken Wand | ruins reward | 2 | 2 | 1.00 / 1.00 (baseline) |
| Twin Daggers | Rogue | 2 | 2 | 0.95 / 0.89 |
| Fists | Monk | 2 | 2 | 0.85 / 0.90 |
| Bow | Ranger | 2 | 2 | 0.82 / 0.91 |
| Hammer | Dwarf | 3 | **2** | 0.81 / 0.95 — already tier 2 strength |
| **Iron Sword** (new) | Knight | — | 2 | target about 0.85 |
| **Bone Staff** (new) | Necromancer | — | 2 | target about 0.95 |
| Golden Sword | Mad King reward | 3 | 3 | 0.78 → buff to about 0.65 |
| Javelin | sewer reward | 3 | 3 | 1.17 / 1.23 → **needs a buff** |
| Sludge Slinger | hidden boss / Gloop | 2 | **3** | 1.84 / 1.44 → buff |

Moving the hammer to tier 2 makes its upgrades cheaper (×1.25 gold instead of ×1.5). Moving the slinger to tier 3
makes them dearer.

## 2. Iron Sword for Sir Brandt; the Golden Sword becomes the Mad King's prize

- **Iron Sword** (new, tier 2): **a stab first, the swipe later.** It uses the same sword frame **without** the gold
  tint (the gold comes from the tint today), so it needs no new art. It swats one bolt per swing.
  - **Levels 1–4: a stab.** Thrust (`thrust: true`), a narrow 30° cone, a longer 36px reach, 26 damage, 450ms, knockback
    1.4. It is precise and hits about one enemy at a time.
  - **Level 5 twist `sweep`: the stab becomes a swipe.** A 100° arc at 28px reach, keeping the damage. The upgrade is
    a visible milestone: the sword learns to swipe.
  - Alternative: a combo that stabs, stabs, then swipes (`cycle` + finisher), as the Fists do. It is less distinct
    from the Fists and leaves the level 5 slot empty.
  - Tune so levels 1–4 sit in the tier 2 band. The weapon profile already handles thrust and arc.
- **Golden Sword** (tier 3, Mad King reward only): gets some strength back so winning it means something. Suggestion:
  24 damage, 450ms swing, knockback 2.0, 110° arc. It still swats only one bolt per swing, and keeps its slash-wave
  twist. Tune until the tier 3 band passes.
- **Saves:** heroes' signature weapons come from content, so the Knight starting with the Iron Sword is a content
  change. Anyone who already owns the Golden Sword **keeps it**, and so does any loadout that has it equipped. If a
  save field has to change, it bumps the save version with a tolerant migration and tests, and never removes a
  weapon.

## 3. Burning Javelin, and fire that sticks

- The **Javelin becomes the Burning Javelin** (tier 3, sewer reward). It has a flickering orange glow while it flies
  and while it's stuck. Each enemy it passes through **catches fire**.
- **Burning** is one shared status (pure logic in `src/logic/burning.ts`, built on the existing `DotTracker`, on
  `GameClock`). It does a small tick every 500ms for 3s. Reapplying refreshes the duration and doesn't stack. A
  burning target has a flame tint and particles, so it's easy to read. It stops at run end (`feel.isLocked`), and
  awards XP to the player when it kills.
- **Fire pits set things on fire too.** A player or monster that steps into a pit keeps burning for a while after
  leaving: 2s for the player, 3s for monsters. Monsters walking through pits become a tactic (lure them in).
- **Forgiving for the player:** a burn tick is about 2% of max health (a pit tick is 4%). There is a clear flame on
  the hero and a small "burning" HUD cue. Drinking a potion puts the fire out.
- **Balance:** the javelin's damage stays about the same and burning carries the buff. Target tier 3, about 0.75 room
  damage. The model's `HAZARD_EXPOSURE.firePit` gains the lingering burn, and the desert and palace bands must still
  pass. If they don't, trim the in-pit tick rather than the band.
- The level 5 twist `stickBurst` stays. The burst now sets everything it hits on fire.

## 4. Sludge Slinger becomes tier 3

- Suggestion: **18 damage every 480ms (37.5 DPS)**, up from 15 / 600ms, plus the slowing puddle the model doesn't
  count. A faster throw also means more puddles on screen, which is more fun. Tune until the tier 3 band passes.
- Its upgrade cost rises to the tier 3 multiplier.

## 5. Bone Staff for Morwen the Necromancer

- **Bone Staff** (new, tier 2): shoots a short **crescent bolt** that hits every enemy inside its small arc (about
  60°), then fades after about 120px. It reuses the sword's slash-wave code (`MeleeSystem.sendWave` / `WAVE`),
  moved into a shared spot so ranged weapons can fire it too. It stays a caster weapon, unlike the bladed weapons
  (it can't swat bolts), and differs from plain bolts by hitting groups at short range.
- Suggestion: 9 damage, 420ms, crescent range 120, pale bone/violet tint. It uses the staff frame with a tint, and the
  crescent uses the existing wave texture with a tint.
- **Level 5 twist `boneRise`:** enemies slain by a crescent may rise as a **lesser skeleton**. This ties into Risen
  Dead, but must not make the Necromancer overpowered:
  - Lesser skeletons have half the health and half the damage of Risen Dead ones, and last 5s instead of 8s.
  - They count toward the existing **cap of 3 allies at a time**, so the twist adds uptime, not a bigger army.
  - Chance: 10% per crescent kill. It stacks with Risen Dead's 15%, rolled once per kill.
  - The model doesn't cover allies, so add a pure test that the expected number of skeletons alive never exceeds 3
    and that lesser skeletons' damage per second stays below the staff's own.
  - On other heroes (if another hero equips the Bone Staff), the twist still raises only lesser skeletons.
- The Wizard keeps the Apprentice Staff as the true starter weapon.
- Model: the weapon profile gets a crescent rule: about 1.4 targets per hit in a crowd, with ranged kiting worked out
  from its 120px range.

## Also check

- Twists for the new weapons need `upgradeInfo` text.
- New weapons need `gameText`-safe names on the loadout screen.
- The weapon test stays green: staff tier 1 passes, and the javelin, slinger and Golden Sword get tuned into tier 3.

## Out of scope (later)

- Aim help for the wand on touch and gamepad.
- A cue after each slow swing, so the player knows their press registered.

## Decisions

- **2026-10-29:** Balance goes by tier: a hero's own weapon is tier 2, a boss/level reward is tier 3, and the starter
  is tier 1.
- **Hammer:** moves to tier 2.
- **Iron Sword:** for the Knight. Levels 1–4 are a stab, and the level 5 twist `sweep` turns it into the swipe (not a combo).
- **Javelin:** becomes the Burning Javelin. Burning is a shared status, and fire pits now set players and monsters
  on fire for a while after they leave.
- **Bone Staff:** the level 5 twist raises lesser skeletons (weaker, shorter-lived, inside the existing cap of 3).
- **Golden Sword:** becomes the Mad King's reward only (tier 3). **Sludge Slinger:** moves to tier 3. Both as
  proposed, numbers tuned to the bands.

## Built (Builder A: sword, slinger, Bone Staff)

Weapon test is by tier (damage / clear vs the level 1 wand; below 1 is stronger):

| weapon | tier | final numbers | dmg / clear |
|---|---|---|---|
| Iron Sword | 2 | 20 dmg, 450ms, 45 degree stab (30 missed enemies 22px off-axis in QA), 36px, knockback 1.4; level 5 `sweep` = 100 degrees, still 36px | 0.85 / 0.86 |
| Golden Sword | 3 | 24 dmg, 450ms, 110 degrees, 28px, knockback 2.0 | 0.65 / 0.76 |
| Sludge Slinger | 3 | 24 dmg, 480ms (50 DPS) | 0.73 / 0.85 |
| Bone Staff | 2 | 16 dmg, 420ms, crescent 120px (the suggested 9 damage sat at 1.8 / 1.5, far outside the band) | 1.02 / 1.00 |

- The model gained rules: crescent 1.4 targets per hit (`CRESCENT_TARGETS`), lobbed blobs 1.3 targets plus 0.2 contact avoided for the slowing
  puddle (`LOB_TARGETS`, `PUDDLE_SLOW_AVOIDED`; these were not counted before), and burn damage for the burning javelin (`burnDps`).
- The suggested slinger numbers (18 / 480ms) reached only 0.89 even with the puddle rules, so damage went to 24.
- The tier 1 rule compares the staff at upgrade level 5 with the level 1 wand (the staff gets 3.1 to about 1.4).
- Saves: v12 migration gives every unlocked hero their signature weapon (Iron Sword, Bone Staff) without equipping it or removing anything. A Golden Sword
  stays owned, levelled and equipped. A hero's +10% damage bonus applies only to their signature weapon, so a Knight wielding the Golden Sword and a
  Necromancer wielding the Apprentice Staff lose it (intended).
- `boneRise` rolls once per kill: under Risen Dead's 15% a full skeleton rises, and a crescent kill adds 10% on top for a lesser one (`risingFor`).
  Skeletons have no health, so "half the health" is expressed by half the bite and 5s instead of 8s.
