# A quiet neighborhood café

First visual milestone for Café After Class: an unbranded, contemporary Korean neighborhood café in miniature. The owner subsequently authorized a first standalone, browser-local focus-and-drink loop.

## Composition and influences

Café Noon in Brossard provides the material mood described in the brief: honey wood, a rounded counter corner, ribbed warm pendants, neutral plaster, a black pastry case, and storefront stools. This is an original composition, not its floor plan, branding, menu, photography, or assets. The Roost informs intimacy, Chibi-Robo tactile proportions, and Spirit City quietness. None of their assets are used.

A fixed, slightly elevated three-quarter camera stays near the counter. The iced latte and tray are the foreground focus; two pendants balance the upper frame. The pastry case, muted olive espresso machine, cups, and window stools merely suggest the room. Mobile retains the same angle and materials, with a tighter horizontal crop and adjusted camera distance. No orbit controls.

## Visual language

Soft low-poly silhouettes and rounded edges; honey, oat, cream, charcoal, and muted olive. Original primitive meshes, lathed pendant shades with individual ribs, a seeded procedural plaster texture, and clean tone-mapped rendering. Afternoon window light and warm pendants support the tactile forms. Avoid silver showroom surfaces, busy decoration, pixel/VHS filters, dashboard cards, or detached control panels.

Typography is restrained system serif with small utilitarian labels. The order slip is HTML projected from a point on the counter, with paper color, slight perspective and a small shadow; this keeps its text readable on phones. The interactive order slip uses the same paper language at the counter edge; on phones it follows the room vertically so controls remain readable and do not overlap. A small scene-anchored paper echoes the current reward. The tray displays the drink only after making it, with a flavor-specific color. Rendering runs on startup, resize, and game transitions; the timer updates HTML once per second without a continuous 3D animation loop.

## Scope and verification

The first playable scope is one goal and one guest/order at a time, with three recipes. No accounts, backend, coupons, real café identity, partnership claims, external art dependencies, public integration, or deployment. Changes remain local and uncommitted for review.

Production build and Chromium software-WebGL screenshots checked at 1440 × 1000 and 390 × 844. Review found tiny paper text and shadow artifacts; the paper treatment and counter shadow reception were adjusted. No page errors or horizontal overflow in those viewports. This is not real-device GPU, Safari, or Firefox validation. Vite emits a bundle-size advisory because Three.js is included in the single initial scene bundle (~128 KB gzip).

## Playable milestone

The paper slip accepts a goal and 25- or 45-minute focus duration. During focus the timer and goal remain legible while book navigation recedes. At the deadline, the player confirms completion or carries the unfinished goal forward. Only completed goals award one random flavor ingredient. The starter pantry has three milk and three ice; after focus these basics are stocked to at least one, so each of the three eligible random flavors can become a first drink and subsequent focus rewards remain useful. Serving unlocks the recipe in the small menu. The single guest accepts any of the three drinks.

The 10-second demo is explicitly marked and uses session storage, while real progress uses local storage. Every demo entry starts fresh; reload returns to the untouched real game. Real receipts include completed and carried goals, with carried goals earning nothing. No claim is made that the app can verify actual attention or resist local clock/storage manipulation.

## Serve-motion review

A successful saved serve triggers a 560 ms slide across the counter with a small settling overshoot. When that serve learns a recipe for the first time, a paper recipe card enters after 480 ms and finishes at 700 ms. Reduced motion skips both slides and shows the final state immediately. There is no camera, customer, ingredient-arrival, or focus-room animation.

The persistence adapter returns a successful-serve effect only after its write succeeds. Only the initiating UI dispatches that effect; generic scene rendering, resize, reload, and cross-tab state synchronization never dispatch it. The served drink pose and newly unlocked recipe card reconstruct from saved state without replay. Serving an already learned recipe has no new-recipe card. A new state change or resize cancels any remaining drink motion and applies the correct saved pose.

Run `node test/serve-motion.cjs` against the production preview for normal/reduced motion, desktop/mobile, repeated serving, rapid clicks, reload, resize, and cross-tab checks. `CAFE_ARTIFACTS` sets the capture directory. The original end-to-end browser walkthrough remains `npm run test:browser`.

## Batch 1: ingredient arrival and small menu

After the confirmed completion award is saved, one labeled paper packet settles onto the tray over 420 ms. The slip reports both the awarded quantity and current pantry count. Only a successful new completion in the initiating tab emits the arrival effect; restoration, resize, and storage sync show the final packet without replay. Reduced motion places it immediately. Beginning another phase cancels arrival; focus remains still. The earlier Serve animation is preserved.

The existing three recipes are retained: iced latte, iced matcha latte, and iced cocoa. Cocoa is the compatible third option instead of substituting hojicha and silently relabeling existing earned ingredients. No version/key migration is required. The paper menu shows all recipe names, learning status, exact supplies and shortages, and an enabled Make action only during the counter turn with enough ingredients. Unlearned recipes may be made and served to unlock them. The shared recipe-status function keeps menu and counter availability consistent; a menu left open updates when another tab changes progress.

Every eligible flavor can make the first drink with starter milk and ice. Completing focus restocks those basic supplies to at least one, preventing an unlucky flavor drop from blocking the loop while flavor rewards remain random. Rotating orders are intentionally not included in this batch.

Verification commands: `npm test`, `npm run build`, `node test/ingredient-menu.cjs` (four desktop/mobile normal/reduced-motion demo walkthroughs), and `node test/menu-save-sync.cjs` (v1 save preservation, live cross-tab menu, reduced-motion arrival, all recipes by keyboard). Capture paths can be set with `CAFE_ARTIFACTS`. Browser checks use local Chromium with software WebGL; they are not Windows/GPU or real 25-minute endurance tests.

## Rotating orders review

One persisted `order` recipe ID belongs to the current guest; its visible number is `served + 1`. Completion selects an initial feasible order when none is pending. A successful serve increments the count and selects the next order in the same saved transition: prefer a different feasible recipe, then favor a learned recipe among those candidates. Feasible unlearned drinks remain eligible for discovery. If no recipe can be made, order is null and the slip points to the next focus session. Taking the next order only changes phase; ingredients are consumed on Make.

A blocked pending order displays shortages. Swap chooses another feasible drink (or a named ready drink from the menu), changing no inventory, rewards, recipes, or receipts. With no ready alternate, Swap is omitted and Study is offered. Completing study tops up milk/ice and awards one random flavor, so the pending order can either be made or safely swapped to that new flavor. There is no animated customer or camera motion.

The existing v1 storage key is retained. Old snapshots lacking `order` receive a deterministic default in memory, preserving the drink already on the tray, receipts, inventory, and unlocks. Opening a save alone does not rewrite it; the next successful transition saves the added field. Orders use the same localStorage/sessionStorage separation as real/demo progress and the same cross-tab Web Lock. Order actions also carry the displayed served count, so an action queued by a stale tab cannot mutate a later guest.

Run `npm test`, `npm run build`, and `node test/orders-browser.cjs` with the preview running. The browser test covers two complete 10-second demo orders at desktop/mobile normal/reduced motion, prior snapshots, immediate feasible rollover, duplicate clicks, cross-tab/reload, blocked swaps, and empty-pantry recovery. `CAFE_HTML` with `CAFE_URL` optionally tests the standalone HTML using an intercepted response with networking disabled. No commit, push, PR, or deployment is part of this review.

## Preparation and receipt-collection review (after checkpoint 6db0663)

Drink preparation is a 700 ms stationary pour and rising colored fill/layer in the actual glass. A small ceramic pouring vessel and narrow stream disappear when the fill completes. The existing 560 ms slide remains exclusively the Serve gesture. Every Make transition saves the ingredient deduction before emitting its one-tab preparation effect; replay, resize, cross-tab sync, or moving to another phase cancels motion and restores the saved final pose.

At the deadline, the slip displays a paper receipt marked Ready to collect. Nothing is auto-collected: Collect receipt · goal complete explicitly confirms the goal, files the receipt and awards the ingredient in one saved transition. A 380 ms upward pickup/fade acknowledges collection. Carrying unfinished work still grants no reward. Reduced motion skips the pour, slide, and paper movement. HTML controls remain enabled immediately after a successful save; visuals never gate game state.

Demo collection uses a separate `demoReceipts` array within demo sessionStorage, visible in the Demo receipt book. Real receipts and real pantry remain unchanged; leaving/reloading demo retains the established isolation behavior. Legacy saves lacking this additive field remain readable. Session-ID guards reject a receipt click queued for a different session. All visual effects follow successful persistence, not timer expiration or generic rendering.

Verify with `npm test`, `npm run build`, and `node test/receipt-preparation-browser.cjs` against the preview. The browser script can test the standalone HTML with `CAFE_HTML` and `CAFE_URL`, networking disabled. It covers the actual 10-second uncollected state, manual collection, book entry, preparation then serving, rapid clicks, desktop/mobile and reduced motion, real-save reload and cross-tab behavior. Windows direct-file/GPU verification is not available in the Cloud browser.

## Study queue

The existing goal form can save up to three pending goals, each with a stable ID and a 25- or 45-minute duration. The active session is separate from those pending goals. The paper queue shows its next goal and a small expandable list with Remove controls. Start next session is available while idle and after a successful Serve; it never runs automatically. Starting atomically removes only the displayed first item and saves its session/deadline. Carry retains the existing unfinished-goal form and receipt behavior without a reward, leaving other queued goals alone.

The v1 key remains. Missing queue and queueRevision fields default in memory without rewriting old saves. A revision guard rejects edits from a stale queue view, while the existing Web Lock serializes writes across tabs. Demo uses its own queue, ten-second deadlines and temporary receipt book.

## Direction at the queue checkpoint

At the queue checkpoint, camera navigation, interior editing and an earned shop were future direction. The later navigation, decoration and shop releases below implement their first bounded version. Food remains a later extension; there is no avatar or full cooking game.

## Recipe collection

The fourth stable recipe ID is milk-cloud: Iced milk cloud, cold milk with an airy milk-foam top over ice. It uses one milk and one ice, shown in cream tones in the existing glass. Fulfil two customer orders to unlock it, with visible 0/2, 1/2 and 2/2 progress in the paper menu. Original recipes still become learned on their first serve. Study rewards remain random coffee, matcha or cocoa; the new drink introduces no second chance gate.

Successful Serve increments the existing served total, records the exact newly unlocked recipe IDs, and chooses the next eligible feasible order in one transition/write. Locked milk-cloud never enters rotation or a swap. Completing the second ordinary demo order leaves enough starter milk and ice to make it immediately as the third order. No ingredients are awarded for collection. Old successful orders count toward the threshold: loading adds the earned unlock in memory without rewriting stored data or firing a reveal. Existing recipes, receipts, inventory, queue and active deadline are preserved.

Run npm test, npm run build, and node test/queue-collection-browser.cjs. CAFE_QUEUE_ONLY=1 exercises the queue independently. The full browser script covers two actual ten-second queued sessions and the new drink, desktop/mobile and reduced motion, manual receipt collection, duplicates, old saves, resume, two-tab queue starts and demo isolation. The prior browser smoke and menu-save-sync checks remain useful regressions. This new feature pass follows animation checkpoint 0035be393787196d34bd286166bbe77336bcc5a0 and was verified as a separate playable checkpoint.

Queue editing also preserves an idle form draft when a storage event refreshes the queue. If a concurrent edit makes Save stale, its goal/duration stay in the form with a retry notice. Starting another queued goal retains an unfinished goal for later. Run node test/queue-sync-browser.cjs to force concurrent writes and verify these cases.

## Navigation release

The owner has now authorized navigation, editable interiors/exteriors and an earned shop. The old fixed-camera restriction applies to focus, not explicit Look around mode. OrbitControls runs only on the canvas while exploring: left drag orbit, right drag pan, wheel zoom; touch orbit/pinch/pan and HTML/keyboard alternatives are available. Distance, elevation and target bounds prevent losing the scene. No damping or automatic camera animation is used. Focus and leaving demo return to the quiet interior service view. A cutaway façade, patio, awning and entrance establish an actual exterior.

## Decoration release

Environment data uses stable object IDs, transforms and surface IDs in an additive version-1 layout. It remains separate from renderer objects and game inventory. The pure validator checks room/patio bounds, furniture clearance, wall slots, decal/window overlap and palette choices. Saves carry an expected layout revision so a stale tab cannot overwrite newer edits. One saved layout undo is retained; drafts remain UI-only until Save. Default layouts are supplied to old snapshots in memory without rewriting them on read.

The service counter is a shared Three.js group containing its tray, drink, preparation gesture, ingredient packet and pastry case. The paper anchor and quiet camera target follow it. Original procedural decals, tiles and materials work indoors and outside. Navigation is disabled during edit previews to separate gestures. Test with npm test, npm run build, node test/environment-browser.cjs and node test/environment-sync.cjs against the production preview.

## Earned shop release

Each saved successful serve earns 10 café coins. The economy record stores balance, total earned, owned catalogue IDs and purchase records (unique purchase ID, catalogue ID, canonical price, timestamp). Buy validates funds and ownership under the same Web Lock as orders and saves debit/ownership/recipe unlock together. Repeat clicks, competing tabs and reload cannot pay or charge twice. Old snapshots receive 10 coins per prior served order in memory without a write; the next transition persists that migration. Invalid balances, purchase records and layouts are kept untouched with an error.

The first catalogue has a reading table, patio planter, terracotta tiles and iced shaken latte. Owned furniture has separate stable layout IDs and a placed flag; storing/moving/undoing does not alter ownership or refund coins. Optional new layout items migrate into earlier layouts and undo snapshots without replacing existing edits. Recipe eligibility includes purchase ownership, while original first-serve learning and the two-order milk-cloud milestone remain unchanged. Rendering projects state only; navigation, editor UI and shop UI are separate modules. Recipe serveValue leaves a small extension point for later food without implementing an economy engine.

The explicitly labeled demo shop starter grants 60 practice coins and a small pantry once per demo. It cannot execute in normal play, and a normal save containing demo credit is rejected. Demo earnings, ownership, purchases, decoration and study receipts remain in sessionStorage. Desktop/mobile normal/reduced-motion browser walkthroughs cover earning, buying, placing, recipe use, reload and concurrent debits. Direct Windows/GPU testing is not available in Cloud; the remote develop branch is the review source of truth.

## Direct placement and Backstore

Keep the current meshes. Spatial rules now live in `placement-model.js`: stable dimensions, floor/patio bounds, snap origins at world zero (0.25 floor units, 0.1 wall units), wall eligibility and service anchors. Decorative mesh replacements must respect that contract. Visible-scene raycasting respects opaque walls and selects IDs; it does not define collision footprints or placement bounds. The floor/patio grid appears only for floor pieces; wall pieces show only their selected eligible wall grid at a fixed height. Preview footprints are green when valid, red with a cross when invalid; HTML gives the reason. Windows retain their bounded wall slots and size.

The placement controller owns only a primary left-button/single-touch gesture that starts on a placed piece. Empty-space, right-button and multi-touch gestures never move or save an item. A second touch, lost capture, pointer cancellation, blur or resize restores that gesture's starting preview. Release only finishes a preview; Confirm is the sole save action. Camera orbit/pan/zoom is held in edit mode, with explicit Interior/Exterior framing buttons. Cancel restores the persisted room; one saved undo remains. Opening Backstore and entering placement do not reset the camera. Focus and demo-mode changes remove overlays and discard drafts.

Backstore is a categorized view of existing owned catalogue IDs and layout instances, not a second inventory. Buying a furnishing leaves it stored; placement/repositioning uses the same ID and never copies it or debits coins again. Existing built-ins are implicitly placed when their older snapshots omit the flag; explicit `placed:false` stores them, except the working counter which stays placed. Recipes remain Menu unlocks. Tiles are reusable whole-floor/patio finishes, not per-tile objects. Machines has no separate owned stock; the current fixed espresso equipment is not made into a new shop item. No art refresh, food or catalogue expansion in this pass. Later art work should polish one corner first.

Verification adds `test/placement.test.js` and `test/placement-browser.cjs` for spatial contracts, storage/ownership, direct floor and wall drag, invalid previews, pointer cancellation, multi-touch/resize interruption, camera ownership, Backstore categories, confirm/cancel/undo and reload. Existing environment/service, concurrent-save and full focus-loop checks remain relevant. Cloud Chromium uses Linux software WebGL, not Windows or physical phone GPU verification.

## Service corner reference

Use the service corner as the material and scale reference for later room art. The charcoal bar has a recessed foot, a bent return and a thick timber edge. The espresso machine sits on the left, with two working groups, a drip grate, glazed demitasses and a small pressure dial. Keep the right-hand stretch clear for the tray, glass and paper. Let brass and satin nickel catch light at the edges. Reserve clay and muted jade for ceramics, enamel and small works on paper.

Keep movable fittings together. The bar, machine and tray belong to the counter layout object. The rear workbench, shelf and original still-life prints belong to the room. An edited rear window takes precedence over overlapping background fittings, and an edited decal takes precedence over a print. The oak finish shows staggered boards on a finished base. Other floor finishes retain their tile surface. The pleated pendants and window transom should still read from the quiet study camera.

Model geometry and procedural artwork live in `src/service-corner.js`, `src/corner-shell.js` and `src/corner-materials.js`. Batch stationary details within each assembly and instance the floorboards. Keep layout footprints, service anchors, camera presets and saved progress independent of the meshes.
