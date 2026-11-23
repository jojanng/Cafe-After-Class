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
3. The earned ingredient arrives as a labeled packet on the tray. Open the paper menu to see unlocked recipes, available drinks, and missing ingredients. Make an available drink with one flavor, one milk, and one ice. The starter pantry has three milk and three ice. Each completed focus session restocks those basics to at least one.
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

The browser check uses Playwright with `/usr/bin/chromium` by default. Override `CHROMIUM_PATH`, `CAFE_URL`, or `CAFE_ARTIFACTS` as needed. Captures default to ignored `artifacts/`. Unit tests cover all eligible first drops, 45-minute deadlines, refresh persistence, repeated actions, carry-forward, demo isolation, and storage errors. Browser checks exercise real start/reload/carry plus the full 10-second demo at 1440×1000 and 390×844; a controlled clock tests real completion and competing tabs. No 25/45-minute wall-clock endurance run, physical-phone performance, Safari, or Firefox verification. Three.js produces Vite's >500 KB initial bundle advisory (~149 KB gzip).

Read [art direction](docs/art-direction.md) before extending. Verified checkpoints are published to `develop` under the owner’s current workflow. No PR, merge to main, or deployment is included.

The small menu retains iced latte, iced matcha latte, and iced cocoa with the original save keys (no migration). Batch-one browser checks: `node test/ingredient-menu.cjs` and `node test/menu-save-sync.cjs`, with the production preview running.

## Rotating orders

The counter slip now names one order. Make and serve it to advance the guest count. If another drink is feasible, **Take the next order** continues immediately; otherwise **Write the next goal** starts restocking through study. New orders favor a different feasible drink and learned recipes, while ready unlearned drinks remain discoverable.

**Swap to another ready drink** is free. The menu also lets you select a ready alternate; Make then consumes its ingredients. Missing ingredients are listed on the slip and menu. If nothing can be made, use **Study for the next order**; no reward or inventory is lost merely by swapping or returning to study. Each completed focus provides a usable flavor and at least one milk/ice, so recovery always has a playable option.

Old v1 saves receive a safe order default without rewriting their data on open. The pending order is persisted with every successful transition, and Serve rolls over exactly once. Run `node test/orders-browser.cjs` for the two-order browser review; set `CAFE_ARTIFACTS` for screenshots.

## Preparation and manual receipt collection (review pass)

After either timer ends, a paper receipt waits on the slip. **Collect receipt · goal complete** files it and awards one ingredient; nothing is collected automatically. The 10-second demo has its own temporary receipt book, accessible through **Receipts**, without writing real study receipts. If the goal is unfinished, carry it forward without a reward.

**Make** now pours and fills the glass briefly; **Serve** still slides it across the counter. Reduced motion shows final states immediately. Saving is independent of animation and repeated clicks cannot duplicate a study reward, ingredient deduction, receipt, or order.

Run `node test/receipt-preparation-browser.cjs` for the receipt/preparation smoke checks. This review pass follows pushed checkpoint `6db0663e59631c0a7417342f522c7970c4b83cf0`.

## Study queue (playable checkpoint)

Write a goal, choose 25 or 45 minutes, and choose **Save to study queue** to keep it for later. Up to three pending goals are saved locally. **Start next session** starts the first queued goal explicitly, including after Serve. Nothing starts automatically. Expand **View queued goals** to remove an item. Carrying an unfinished goal prefills the existing goal form without a completion reward and leaves the remaining queue intact. Demo queues use 10-second sessions and never change real progress.

## Recipe collection (playable checkpoint)

**Menu** now includes a collection count and **Iced milk cloud**, unlocked after **2 fulfilled customer orders**. It uses one milk and one ice; ordinary recipes keep their first-serve discovery behavior and study ingredients stay random. Prior successful orders count, and old unlocks remain yours. The earned shop below adds a separate purchasable recipe without replacing this progression.

For a quick review, enter the demo, save two goals to the queue, and choose **Start next session**. After each 10-second timer, manually collect its **10 sec** receipt, Make and Serve. After the first Serve, start the next queued session explicitly. After the second Serve, inspect Menu's 2/2 progress and take the next order to make Iced milk cloud. Leave demo to restore unchanged real progress. Run `node test/queue-collection-browser.cjs` for this walkthrough; screenshots go to `CAFE_ARTIFACTS`. Navigation, decoration and the earned shop are now available as described below.

## Look around

Choose **Look around** to enable canvas navigation. Drag to orbit, right-drag to pan, and wheel to zoom. On touch use one finger to orbit or two fingers to pan/pinch. The paper camera controls and focused-canvas arrow keys, Shift+arrows and +/− offer alternatives. Interior, Exterior and Reset view restore bounded framing. Focus always returns to the quiet interior and disables navigation. Run `node test/navigation-browser.cjs` with the production preview running.

## Decorate

Choose **Decorate**, select an object, and edit its position/rotation/finish. The service counter carries its tray, glass, pastry case and paper with it. Interior stools and the exterior patio bench move on their respective floors. Interior/exterior windows and wall decals can switch between left/rear walls and move along them. Expand **Floor tiles & wall paint** for independent interior floor, patio, interior wall and exterior wall finishes.

Edits are previews until **Save decoration**. **Cancel changes** restores the saved layout; **Undo last saved edit** restores one earlier layout. Bounds, furniture overlap and window/decal overlap are rejected. Counter rotation is limited to 0°/180° for the work aisle; other furniture uses quarter turns. Wall features retain their size/height. This is a bounded cutaway café, not arbitrary architectural construction. Camera gestures are held while decorating and editing is unavailable during focus. Layouts persist in the same browser save and remain isolated in demo mode.

## Café coins and shop

Each successfully served order earns **10 café coins** exactly once. Earlier fulfilled orders receive the same credit when an old save is loaded. The shop sells a **reading table (20)**, **patio planter (15)**, **terracotta tile finish (10)** and **iced shaken latte recipe (20)**. Purchases are permanent in this browser save, with no real-money system. Bought furnishings appear in Decorate: select one, check **Place this furnishing**, position it, and Save. Uncheck to store it again. Bought tiles appear in the floor/patio finish list. The bought recipe appears in Menu and uses coffee, milk and ice; orders never require it while locked or unavailable.

For a quick isolated review, enter the 10-second demo, complete one goal, collect its receipt, Make and Serve to earn 10 coins. Open Shop and choose **Demo shop starter · 60 coins + pantry** once. Buy all four items, place the furniture and apply tiles in Decorate, then study/collect again to make the purchased recipe from Menu (swap to it if another order is selected). This shortcut exists only in the demo; leaving/reloading demo returns to unchanged real saves.

Validation: `npm test`, `npm run build`, and (with `npm run preview` running) `npm run test:browser`, `node test/navigation-browser.cjs`, `node test/environment-browser.cjs`, `node test/environment-sync.cjs`, and `node test/shop-browser.cjs`. Browser scripts use the installed Chromium path `/usr/bin/chromium` in Cloud; Windows play only needs npm and a WebGL-capable browser, not those Cloud test scripts.

## Windows / VS Code

Install Node.js 22.12+ (or compatible Node 20.19+), clone the develop branch, open its folder in VS Code, and run:

```powershell
git clone --branch develop https://github.com/jojanng/Cafe-After-Class.git
cd Cafe-After-Class
npm ci
npm run dev
```

Open the localhost URL printed by Vite on your own Windows computer. For an existing checkout use `git switch develop` then `git pull --ff-only origin develop`, `npm ci`, and `npm run dev`. For a production check use `npm test`, `npm run build`, and `npm run preview`. Dev and preview ports use separate browser saves. No deployment is required.
