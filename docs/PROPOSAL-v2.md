# v2 Proposal — Skills, Economy, Characters, Monsters, Hazards

Based on playtest feedback (items 3, 4, 8, 9, 10). Status: **Phase 1 (skills + loadout), Phase 2 economy (gems, upgrades, Camp shop, potions, revive) and Phase 3 heroes done**; decisions agreed (see §7).

## 1. Skills & loadout (feedback 8)

**Slots:** 1 basic attack (weapon) + 3 skill slots. Fireball becomes a skill.

| Slot | Keyboard/mouse | Gamepad | Touch |
|---|---|---|---|
| Basic | LMB (hold) | RT / right stick | Aim stick |
| Skill 1 | RMB or 1 | LT | Button 1 |
| Skill 2 | E or 2 | RB | Button 2 |
| Skill 3 | R or 3 | LB | Button 3 |
| Dash | Space | A | Dash button |

HUD: bottom-centre skill bar — icon, cooldown sweep, and the **key/button glyph for the device last used**
(Kenney *Input Prompts* pack has keyboard, Xbox and touch glyphs).

**Loadout screen** before each level: pick basic weapon + 3 skills from what you own.
**Swap prompt** when you pick up a new skill with all slots full: pauses, shows new vs current, choose which
to replace (or discard). Unequipped skills stay owned.

### Ten skills

| # | Skill | Effect | Unique twist (upgrade lvl 5) |
|---|---|---|---|
| 1 | Fireball | Slow orb, explodes in AoE | Splits into 3 mini-fireballs |
| 2 | Frost Nova | Ring around you, slows enemies 50% for 3s | Freezes solid (stun) |
| 3 | Chain Lightning | Hits target then jumps to 4 more | Each jump leaves a static field |
| 4 | Boomerang Blade | Thrown, returns; hits on the way out and back | Two blades in a V |
| 5 | Arcane Shield | 3s bubble absorbs damage, deflects bolts | Shield bursts outward on expiry |
| 6 | Poison Cloud | Lingering cloud, damage over time | Cloud follows you |
| 7 | Spirit Wolf | Summon ally wolf for 10s | Two wolves |
| 8 | Blink Strike | Teleport to aim point, damages along path | Leaves a damaging afterimage |
| 9 | Meteor | Telegraphed huge AoE at aim point after 1s | Burning ground afterwards |
| 10 | Gravity Well | Pulls enemies into a point for 2s | Collapses with an explosion |

**Basic weapons** stay separate (staff, broken wand, golden sword, plus later: bow, spear, twin daggers).

**Where skills come from:** boss rewards (Fireball from the desert, as now), rare drops, shop purchases,
character starting kits.

## 2. Economy — gold and gems (feedback 9)

Today: coins have no use, and "charms" (the gem icons) are passive stat boosts that stack.

**Proposal:**
- **Gold → Camp shop** between levels: buy skills, carry-in potions (1–3 potion slot), revive token
  (once per level), extra skill reroll in shop. Prices scale by level tier.
- **Gems → upgrades.** Charms become gems of three colours (red Power, green Swiftness, blue Vitality) that
  are *spent*, not passive. Each skill/weapon has upgrade levels 1–5; each level costs gold + gems
  (e.g. Fireball lvl 3 = 150 gold + 3 red). Levels give +damage / −cooldown; lvl 5 unlocks the twist above.
- Existing saves: current charms convert into gems; nothing lost.

Alternative (simpler): keep charms passive, add separate upgrade crystals. Less interesting choices.

## 3. Characters (feedback 10)

Each hero: stats + a passive + starting kit. Sprites from Tiny Dungeon.

| Hero | Sprite | HP | Speed | Attack speed | Passive | Start kit |
|---|---|---|---|---|---|---|
| Samuel the Wizard | 84 | ●●○ | ●●○ | ●●○ | Skills cool down 10% faster | Staff + Fireball (once unlocked) |
| Knight | 96 | ●●● | ●○○ | ●○○ | Takes 20% less frontal damage | Sword |
| Rogue | 85 | ●○○ | ●●● | ●●● | Dash leaves a dagger trap | Twin daggers |
| Dwarf | 87 | ●●● | ●○○ | ●●○ | +25% gold, potions heal more | Hammer |
| Ranger | 99 | ●●○ | ●●○ | ●●● | Crits on enemies at long range | Bow |
| Monk | 98 | ●●○ | ●●● | ●●○ | Every 5th hit stuns | Fists |
| Necromancer | 111 | ●○○ | ●●○ | ●●○ | Killed enemies sometimes rise as allies | Staff + Spirit Wolf |
| ??? secret | 100 | — | — | — | — | — |

**Unlock by doing things differently** (hints shown on locked cards):

| Hero | Unlock condition | Hint text |
|---|---|---|
| Knight | Beat the Stone Guardian using only the basic attack | "A true warrior needs no tricks." |
| Rogue | Clear the Lost Desert in under 4 minutes | "The desert rewards the swift." |
| Dwarf | Carry 500 gold at once | "Gold calls to the mountain folk." |
| Ranger | Clear any level without taking damage from melee enemies | "Keep your distance…" |
| Monk | Clear a level without picking up any potion | "Discipline over comfort." |
| Necromancer | Defeat 1,000 monsters in total | "So many souls…" |
| Secret | Beat all three bosses with three different heroes | "Many hands, one destiny." |

Progress tracked as stats in the save (kills, best times, damage sources, potions used, per-hero clears).

## 4. Monsters — volume and variety (feedback 4)

**Volume:** later rooms use more waves and bigger waves; a per-level "intensity" curve; mixed packs
(tank in front, shooters behind).

**Variety:** each room introduces at most one new monster, then later rooms mix them.
**Elites** (from room 3 on): glowing outline plus one affix — *Armoured* (½ damage until shield breaks),
*Swift*, *Splitting* (splits in two on death), *Vampiric* (heals on hit), *Volatile* (explodes on death).

| Level | New monster | Behaviour |
|---|---|---|
| Ruins | Bomb Beetle | Runs at you, fuse flashes, explodes (hurts other monsters too) |
| Ruins | Skeleton Archer | Fires, then retreats behind cover |
| Ruins | Wisp | Orbits you, then dives in a straight line |
| Ruins | Rat Swarm | 8–12 tiny weak rats that flank |
| Ruins | Necromancer | Raises dead monsters once each; kill him first |
| Desert | Sand Shark | Fin trail under the sand, leaps out at you |
| Desert | Fire Imp | Fast, leaves a burning trail |
| Desert | Cactus Turret | Stationary, sprays spines in a ring |
| Desert | Dust Devil | Whirlwind; pulls you in and bends your bolts |
| Desert | Mummy Priest | Heals and shields nearby monsters |
| Palace | Mirror Knight | Reflects your bolts from the front; hit from behind |
| Palace | Jester | Bouncing bombs, teleports in confetti |
| Palace | Gargoyle | Statue that wakes when you walk past |
| Palace | Twin Mages | Linked by a beam that hurts if you cross it |
| Palace | Houndmaster | Commands 3 hounds; hounds flee when he dies |

## 5. Environmental hazards that escalate (feedback 3)

The room number sets hazard density and combinations. Every hazard is telegraphed, and monsters are
affected too, so you can lure them in.

| Level | Hazards (introduced in order) |
|---|---|
| Ruins | Cracked floor that collapses after you step on it · falling rubble (shadow warning) · poison gas vents on a cycle |
| Desert | Quicksand (exists) · fire pits · wind gusts that push you · sandstorm that cuts visibility |
| Palace | Spike traps (exist) · pressure-plate arrow walls · swinging pendulum blades · flame jets |

## 6. Suggested build phases

1. **Skills and loadout core — DONE:** slot system, input remap, HUD with button glyphs, loadout screen, Fireball converted to a skill, swap prompt, plus Frost Nova, Chain Lightning, Arcane Shield and Blink Strike. 
   **Phase 2 skills: DONE.** Boomerang Blade, Poison Cloud, Spirit Wolf, Meteor and Gravity Well, all ten level 5 twists (flag in the per-level tables) and the new skills in the scroll pool. Upgrade UI and economy remain.
2. **Economy - DONE:** Camp scene (upgrades + shop), gems, skill and weapon levels 1-5 with level 5 weapon twists, carry potions, revive token, save v7 migration.
3. **Characters - DONE:** hero select (between level select and loadout), eight heroes with stats and passives, unlock tracking and hints, save v8. Frames used: 84, 96, 85, 86, 88, 98, 99, 100 (the proposal's 87, 100, 111 collide with enemy sprites; tints differentiate). Mid-run unlocks (gold, kills) show a banner and the reveal card at the next menu screen.
4. **Content:** new monsters, elites, hazards, room intensity curves.
5. **Balance pass and playtest.**

## 7. Decisions (agreed 2026-10-24)

1. Gems are spendable upgrade material (charms convert to gems).
2. Player level/XP is a shared account level across heroes.
3. Skills come from boss rewards, rare drops, the camp shop and hero starting kits.
4. Build Phase 1 (skills + loadout) first.
