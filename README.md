# levi-games

Levi's game site — [levi.games](https://levi.games)

A static collection of small browser games made for/by Levi. Hosted via GitHub Pages (see `CNAME`).

## Games

- **Levi Leap** (`pixel-jump/`) — endless runner. Jump (and double-jump) over obstacles, collect coins.
- **Levi Snake** (`snake/`) — classic snake with bonus snacks worth extra points.
- **Atom Builder** (`atom-builder/`) — educational sandbox. Add protons, neutrons, and electrons to build atoms; the game identifies the element, isotope, and ion charge. Zoom in on the nucleus to see the quarks (uud / udd) inside protons and neutrons.

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
