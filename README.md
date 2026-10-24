# Samuel's Game

Top-down twin-stick action game (Phaser 3 + TypeScript + Vite). See `docs/DESIGN.md`.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm test           # Vitest (pure logic in src/logic)
npm run typecheck
```

## Controls

| Action | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | Left half: floating stick | Left stick / D-pad |
| Aim | Mouse | Right half: floating stick (last-used device wins) | Right stick |
| Fire | Left mouse button | Right stick past ~50% | RT or right stick past ~50% |
| Alt fire | Right mouse button (not wired to a weapon yet) | Star button, right edge | LT |
| Dash | Space | Arrow button, right edge | A |
| Pause | Esc | Pause button, top right | Start |
| Menus | Mouse / arrows or WASD + Enter, Esc = back | Tap | D-pad / left stick + A, B = back |
| Fullscreen | Top-right button | Top-right button | - |

Touch controls appear after the first touch and hide on mouse, keyboard or gamepad use. The canvas expands from a
640x360 base to fill the screen; portrait touch devices show a "Rotate your device" prompt.

## Assets

Kenney CC0 assets are committed in `public/assets`, so the game runs without any script.
To re-copy them from the Kenney collection:

```
npm run copy-assets
# or, from another location:
KENNEY_DIR="D:\path\to\Kenney Game Assets All-in-1 3.0.0" npm run copy-assets
```

Frame indices for the Tiny Dungeon sheet are documented in `src/content/assetKeys.ts`.

## Game flow, saves and loot

Main menu -> level select (cards: locked / cleared / red "Under-levelled!" when player level < recommended - 1) -> game.
Pause offers Resume or Quit to level select. Levels are data in `src/content/levels/`; `GameScene` starts from `{ levelId }`.
Progress (level, XP), charms, owned weapons and cleared levels are saved in `localStorage` (`samuels-game-save`, versioned,
tolerant parsing in `src/logic/save.ts`). Coins picked up in a run are banked on quit/clear and lost on death.
You start with the Apprentice Staff; Broken Wand is the Ruins reward. Enemies drop coins, potions and permanent charms
(`src/content/lootTables.ts`). To reset: `localStorage.removeItem('samuels-game-save')`.
