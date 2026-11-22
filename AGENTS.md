# Coding guidance

Read [docs/art-direction.md](docs/art-direction.md) before changing the scene, camera, materials, typography, or scope.

This is a browser-local playable milestone built with Vite, vanilla JavaScript, and Three.js. Keep original geometry and local procedural materials; no external asset service is needed. Use `npm ci`, `npm run dev`, and `npm run build`. Review an actual browser render at desktop and mobile sizes after visual changes. Preserve the fixed camera and quiet presentation. The first focus → ingredient → make → serve → recipe loop is authorized. Do not add accounts, a backend, coupons, real café branding, public integrations, or deployment. Keep deterministic rules in src/game.js and storage in src/storage.js. Run npm test and npm run build; use npm run test:browser with a preview server for browser verification. Do not commit, push, or open a PR without a separate request.
