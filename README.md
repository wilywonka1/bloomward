![best-game-01](https://img.shields.io/badge/make.fun-best--game--01-f59e0b)
![BLOOMWARD](https://img.shields.io/badge/BLOOMWARD-tower%20defense-22c55e)

# BLOOMWARD — Defend the Crystal Garden

An entry for make.fun's **best-game-01** ("Make the best game"). A complete,
original tower-defense game that plays offline in a desktop browser from
static files — no library, no build step, no network. Bright, saturated,
flat art, all drawn in code; every sound is synthesised with WebAudio.

## The game

Pests pour from a burrow and march a winding stone path toward the Great
Bloom, the crystal flower at the heart of the garden. You plant living
towers on the grass and hold **14 waves** of the siege. Beetles, darters,
swarm mites, armoured shellbacks and glider wasps come in escalating
mixes — and at wave 7 the **Bramble Boar** crashes through, trailing
mites, while wave 14 brings the **Queen Hornet** herself, who spawns
darters and enrages when badly hurt.

- **Five towers, five jobs:** Sunbloom (cheap seeds of sunlight),
  Frostbell (slows the swarm), Thornvine (fast thorns + poison),
  Bombard Melon (huge splash), Stormspire (chain lightning).
- **Real decisions:** every tower upgrades through 3 levels or sells back
  at 70%. Wave clears pay a bonus **plus 8% interest on banked gold**
  (capped), so sometimes the best move is to *not* spend.
- **Full loop:** title screen with the tower roster, build phase, wave
  banners, boss fights, pause, 1×/2× speed, victory screen with an
  S/A/B/C grade, game-over screen with your best wave — and restarts.
  Best wave and score persist between visits.

**Controls:** click a shop card (or 1–5) then a grass tile to plant ·
click a tower to upgrade/sell · Space starts the wave · P pause ·
F speed · M mute · Esc cancels placement.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` with the vendored library.
- `game/index.html` — the page, HUD bar, tower shop, panels and screens.
- `game/src/main.js` — state machine, game loop, combat, wave flow, staging hooks.
- `game/src/garden.js` — the grid, the winding path, ponds, seeded garden decor.
- `game/src/towers.js` — the five tower types and upgrade scaling.
- `game/src/enemies.js` — the pest bestiary, path movement, status effects, boss spawns.
- `game/src/waves.js` — all 14 waves as data, plus the bonus/interest rules.
- `game/src/render.js` — all canvas painting: garden, towers, pests, effects.
- `game/src/audio.js` — the WebAudio synth: shots, thocks, leaks, fanfares, ambience.
- `game/src/input.js` — pointer and keyboard state.
- `game/src/hud.js` — DOM readouts, shop cards, tower panel, banners, screens.
- `vendor/makefun-game.ts` — the kit's dossier library, unmodified.
- `screenshots/` — real renders of the game, staged with the `?shot=` scenes.

## Run it

Serve `game/` with any static file server and open `index.html`, or run
the entry program the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

MIT licensed.
