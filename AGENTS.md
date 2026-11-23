# Coding guidance

Read [docs/art-direction.md](docs/art-direction.md) before changing the scene, camera, materials, typography, or scope.

This is a browser-local study → ingredient → drink → serve loop using Vite, vanilla JavaScript and Three.js. Keep the room fixed and the study view quiet. Keep deterministic rules in `src/game.js` and save handling in `src/storage.js`. Original geometry and local procedural materials only. Do not add accounts, backend, coupons, real café branding, public integrations, or deployment.

Run `npm ci`, `npm test`, and `npm run build`. Start `npm run preview` before `npm run test:browser`. Review actual desktop and mobile browser renders after scene changes. The current owner workflow is to commit and push verified milestones to develop. Never push main, force-push, open a PR, merge, or deploy without an explicit request.
