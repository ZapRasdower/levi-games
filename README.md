# levi-games

Levi's game site — [levi.games](https://levi.games)

A static collection of small browser games made for/by Levi. Hosted via GitHub Pages (see `CNAME`).

## Games

- **Levi Leap** (`pixel-jump/`) — endless runner. Jump (and double-jump) over obstacles, collect coins.
- **Levi Snake** (`snake/`) — classic snake with bonus snacks worth extra points.
- **Levi Crossing** (`levi-crossing/`) — Frogger-style arcade starring the Levi photo sprite. Hop across roads, rivers, and railways through 10 hand-built levels: ride logs, turtle packs (some dive!), and crocodile backs (avoid the snapping head), dodge trains with warning signals, slip across ice, survive night levels lit only by headlights, fog, and croc-infested goal homes — with an eagle that snatches you when the timer runs out. Coins, a shield power-up, and a level-select for every level you've unlocked (progress and best score in `localStorage`).
- **Atom Builder** (`atom-builder/`) — educational sandbox in 3D. Add protons, neutrons, and electrons to build atoms; drag to spin the atom, scroll to zoom. The game identifies the element, isotope, and ion charge. Zoom in on the nucleus to see the quarks (uud / udd) inside protons and neutrons, take the Electron School mini-lessons, and build neutral atoms to discover all 20 elements in the badge collection (saved to `localStorage`).
- **Solar System** (`solar-system/`) — interactive 3D map of the planets. Click any planet (or the Sun) for facts, speed up time to watch orbits, toggle real-distance scale, follow a planet, and take a planet-spotting quiz. Planets spin with cartoon surface detail (Earth's continents and clouds, Mars's polar caps, Neptune's dark spot, Pluto's heart) and carry their moons (the Moon, Phobos & Deimos, the four Galilean moons, Titan). **Missions** mode is a real orbital-mechanics game on top of the comet sandbox: fly 8 probe missions launched from wherever Earth is right now, each with a fuel budget (max launch speed) so the Sun's gravity has to bend the path — hit Mars, Venus, Jupiter, Saturn, Mercury and Pluto, skim the Sun like Parker Solar Probe, and put a probe into a full orbit. Fewer attempts = more stars (progress saved in `localStorage`). Synth sound with mute, and keyboard shortcuts (Space pause, 1–4 speed, L labels, T trails, R reset view, M missions, C comets, Q quiz, S sound, Esc back).
- **Squishy Pets** (`squishy-pets/`) — cozy idle collector. Open themed blind boxes, squish soft-body pets to earn Dough, buy upgrades, and collect all 32 pets across 4 categories (Dumpling, Sushi, Sweet, Critter). Progress saves to `localStorage`.
- **Brick Breaker** (`brick-breaker/`) — classic paddle-and-ball brick breaker where the spinning Levi sprite IS the ball. Six level layouts (checkerboard, pyramid, fortress…), two-hit bricks with cracks, falling power-ups (wide paddle, triple ball, slow-mo, extra life), combo pitch on brick streaks, synth sound with mute, and endless faster loops after you beat level 6. Best score persists.
- **Watchmaker** (`watchmaker/`) — 3D mechanical watch assembly with a real skill loop. Two difficulties: **Apprentice** (the bench shows the next part) and **Master** (parts are shuffled — you work out the order from what each part needs to sit on; picking too early explains why and costs points, and a hint costs more). For each of the 8 movement parts: pick it, tap its glowing slot (closer to the bullseye = PERFECT/GOOD/OK points; missing the slot is a slip), then **seat** it by stopping a sweeping needle inside a gold zone that gets tighter and faster with every part. When the movement is complete it comes alive — the balance oscillates, the escapement ticks audibly, the gear train spins, the hands run — but it doesn't keep time yet: a **timegrapher** plots every beat, and you move the regulator until the trace is flat (Master hides the numeric rate). Certify it for a scored result with a rank (Tinkerer → Apprentice → Journeyman → Master Watchmaker), time bonus, and per-difficulty best score. Drag (or one-finger swipe) to orbit, scroll (or pinch) to zoom. Three.js r128 is vendored locally, so it works offline like the rest of the site.
- **Levi Galaxy** (`levi-galaxy/`) — Galaga-style space shooter. Levi rides a rocket board and auto-fires at formations of alien invaders (drones, crabs that shoot, zig-zagging wasps, armored tanks) that swoop in, sway, and dive-bomb him. Every 5th wave is a Mothership boss with bullet rings, aimed spreads, and escort drones. Asteroids drift in from wave 3. Catch power-ups (spread shot, rapid fire, shield, bombs, extra lives), drop bombs to clear the screen, and chain kills for a score multiplier. Keyboard, mouse, or touch; best score persists.

## Run locally

It's all static HTML/CSS/JS — just open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Home page

The root `index.html` renders the game grid from a `GAMES` array: category filter chips, a **Surprise me** random picker, NEW / UPDATED / LAST PLAYED ribbons, a pixel starfield with parallax and shooting stars, and a per-game readout of your best score / progress pulled from each game's own `localStorage` save (best scores, elements found, pets collected, mission stars, watchmaker rank…).

## Adding a new game

1. Create a new folder at the repo root (e.g. `my-game/`) with an `index.html`.
2. Add an entry to the `GAMES` array in the root `index.html` (folder id, name, emoji, blurb, tag, category, tint). Optionally add a reader to `STATS` so the card shows a best score.
3. Match the existing dark / yellow pixel styling for consistency.

Per-game best scores are persisted in `localStorage`.
