# Café After Class

A warm miniature café with a browser-local focus → ingredient → drink → recipe loop. Vite, vanilla JavaScript, and Three.js. Original procedural art, no backend or external art assets.

## Run and review

Node.js 20.19+ or 22.12+:

```sh
npm ci
npm run dev
```

Open the printed localhost URL (usually http://localhost:5173). Use the same browser and origin to retain progress. Production review:

```sh
npm run build
npm run preview
```

Open http://localhost:4173. Dev and preview ports have separate browser storage.

## Play

1. On the paper slip, write a goal and select 25 or 45 minutes. Begin focus. Refreshing or switching tabs preserves the deadline.
2. When time ends, confirm the goal is complete to earn one random coffee, matcha, or cocoa. If unfinished, carry it forward without a reward; the next slip keeps the goal. Receipts record real completed/carried sessions.
3. Make an available drink with one flavor, one milk, and one ice. The starter pantry has three milk and three ice. Each completed focus session restocks those basics to at least one.
4. Serve the drink to the single guest. Open Menu to see the recipe you learned. Write another goal to continue.

For a quick review choose **Try 10-second demo**, write a practice goal, wait 10 seconds, confirm, make, serve, and see the menu. **Leave demo** restores real progress unchanged. Demo entry starts a fresh temporary pantry, never writes real receipts, and never unlocks real recipes. Reload exits demo. On narrow phones scroll down from the café to the paper and book buttons.

## Architecture and persistence

- `src/game.js`: pure state transitions with injected time, random value, and session identity. Guards prevent re-awarding, double consumption, and duplicate serves/unlocks.
- `src/storage.js`: versioned snapshot reads and synchronous saves. Each transition atomically persists pantry, session, receipts, and recipes together. Invalid saves are preserved, with a visible error.
- `src/play.js`: accessible HTML controls, timer, dialogs, and orchestration. Web Locks serialize mutations across tabs, re-reading the latest snapshot before each write; storage events synchronize other real-game tabs. Rendering never awards progress.
- `src/main.js`: original Three.js café, responding to state events for tray/drink appearance.

Real state uses localStorage (`cafe-after-class.progress.v1`); demo uses a separate sessionStorage key. A session records an absolute deadline. Expiration opens a completion check, not an automatic goal-completion reward. No network, login, or server clock is involved. The client trusts the device clock and the player's confirmation. Clearing browser data removes progress; private browsing may not retain it. Storage failures are surfaced without showing an unsaved award. WebGL and a modern browser supporting Web Locks on localhost/HTTPS are required.

## Verification

```sh
npm test
npm run build
# With npm run preview already running:
npm run test:browser
```

The browser check uses Playwright with `/usr/bin/chromium` by default. Override `CHROMIUM_PATH`, `CAFE_URL`, or `CAFE_ARTIFACTS` as needed. Captures default to ignored `artifacts/`. Unit tests cover all eligible first drops, 45-minute deadlines, refresh persistence, repeated actions, carry-forward, demo isolation, and storage errors. Browser checks exercise real start/reload/carry plus the full 10-second demo at 1440×1000 and 390×844; a controlled clock tests real completion and competing tabs. No 25/45-minute wall-clock endurance run, physical-phone performance, Safari, or Firefox verification. Three.js produces Vite's >500 KB initial bundle advisory (~132 KB gzip).

Read [art direction](docs/art-direction.md) before extending. No commit, push, PR, or deployment is part of this milestone.
