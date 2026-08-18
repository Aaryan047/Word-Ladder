# Word Ladder

A word ladder (word transformation) game. Change one word into another, one letter
at a time — every step in between has to be a real word.

No login, no accounts, no streaks. Open it, play, close it.

## Features

- **Daily Puzzle** — a new solvable puzzle every day, picked from 365 pre-generated
  days, each with 2 variants (A/B) to choose from.
- **Custom / Free Play** — type your own start and end word (5–15 letters, same
  length), or hit **🎲 Randomise** to have it pick a guaranteed-solvable pair for you.
- **Undo** — pop the last word off your chain if you change your mind.
- **Reveal optimal route** — give up any time and see the shortest possible path.
- **Word validation** — checks against the free [dictionaryapi.dev](https://dictionaryapi.dev)
  API first, falls back to a bundled offline word list if you're offline or the API
  is unreachable.
- **After you solve it** — see your path side-by-side with the optimal (shortest)
  path.
- **Themes** — light/dark mode toggle, plus 4 accent themes named after the Pac-Man
  ghosts (Blinky, Pinky, Inky, Clyde), available in both modes.
- Set in EB Garamond throughout.

## Themes

There's a mode toggle (☾ / ☀) that switches between light and dark base
palettes, and 4 accent themes named after the Pac-Man ghosts — each one
available in both modes, so 8 combinations total:

| Ghost  | Accent color |
|--------|--------------|
| Blinky | red          |
| Pinky  | pink         |
| Inky   | cyan         |
| Clyde  | orange       |

Click a swatch dot to pick a ghost; click the moon/sun icon to flip light/dark
while keeping whichever ghost is selected. The choice is saved in
`localStorage`, so it persists between visits — no account needed for that,
it's just a local browser preference.

## How it works

- `index.html` — markup / structure.
- `style.css` — all styling (CSS custom properties drive the theme system).
- `script.js` — game logic: chain validation, word-ladder BFS solver, theming,
  daily puzzle picker.
- `data.js` — bundled data: the offline word lists (one connected component per
  word length, 5–15 letters) and the 365 pre-generated daily puzzles with their
  precomputed optimal paths.

The word-ladder solver works by treating same-length words as nodes in a graph,
with an edge between any two words that differ by exactly one letter. Finding the
optimal path is a breadth-first search over that graph, done client-side in
JavaScript (rebuilt on the fly for whatever word length you're playing).

Word lists sourced from [dwyl/english-words](https://github.com/dwyl/english-words)
(full dictionary, used for offline validation) and
[first20hours/google-10000-english](https://github.com/first20hours/google-10000-english)
(used to bias daily/random puzzles toward recognizable words).

## A note on long words

English just doesn't have many one-letter-apart neighbors once words get long.
5–8 letter words have dense, well-connected ladders. 9+ letter words get sparse
fast — you can still play them in Custom mode, but don't be surprised if the
solver comes back with "no path found" for an obscure pair. That's the language,
not a bug.

## No backend

Everything runs in the browser. The only network call is the optional dictionary
API lookup for word validation — everything else (puzzles, word lists, solving)
is bundled and works fully offline.
```
