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
