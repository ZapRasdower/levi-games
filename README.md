# levi-games

Levi's game site — [levi.games](https://levi.games)

A static collection of small browser games made for/by Levi. Hosted via GitHub Pages (see `CNAME`).

## Games

- **Levi Leap** (`pixel-jump/`) — endless runner. Jump (and double-jump) over obstacles, collect coins.
- **Levi Snake** (`snake/`) — classic snake with bonus snacks worth extra points.
- **Levi Crossing** (`levi-crossing/`) — Frogger-style arcade starring the Levi photo sprite. Hop across roads, rivers, and railways through 10 hand-built levels: ride logs, turtle packs (some dive!), and crocodile backs (avoid the snapping head), dodge trains with warning signals, slip across ice, survive night levels lit only by headlights, fog, and croc-infested goal homes — with an eagle that snatches you when the timer runs out. Coins, a shield power-up, and a level-select for every level you've unlocked (progress and best score in `localStorage`).
- **Atom Builder** (`atom-builder/`) — educational sandbox in 3D. Add protons, neutrons, and electrons to build atoms; drag to spin the atom, scroll to zoom. The game identifies the element, isotope, and ion charge. Zoom in on the nucleus to see the quarks (uud / udd) inside protons and neutrons, take the Electron School mini-lessons, and build neutral atoms to discover all 20 elements in the badge collection (saved to `localStorage`).
- **Solar System** (`solar-system/`) — interactive map of the planets. Click any planet (or the Sun) for facts, speed up time to watch orbits, toggle real-distance scale, and take a planet-spotting quiz.
- **Squishy Pets** (`squishy-pets/`) — cozy idle collector. Open themed blind boxes, squish soft-body pets to earn Dough, buy upgrades, and collect all 32 pets across 4 categories (Dumpling, Sushi, Sweet, Critter). Progress saves to `localStorage`.

## Run locally

It's all static HTML/CSS/JS — just open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Adding a new game

1. Create a new folder at the repo root (e.g. `my-game/`) with an `index.html`.
2. Add a card to the games grid in the root `index.html` pointing to it.
3. Match the existing dark / yellow pixel styling for consistency.

Per-game best scores are persisted in `localStorage`.
