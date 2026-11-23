import { fresh, transition, chooseOrder, RECIPES } from './game.js';
export const REAL_KEY = 'cafe-after-class.progress.v1';
export const DEMO_KEY = 'cafe-after-class.demo.v1';
export function read(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return fresh();
  const s = JSON.parse(raw);
  if (s.version !== 1 || !['idle','focus','review','counter','serve','served'].includes(s.phase) ||
      !s.pantry || !['milk','ice','coffee','matcha','cocoa'].every(k => Number.isInteger(s.pantry[k]) && s.pantry[k] >= 0) ||
      !Array.isArray(s.recipes) || !Array.isArray(s.receipts) ||
      (['focus','review'].includes(s.phase) && (!s.session || !Number.isFinite(s.session.deadline)))) {
    throw new Error('Saved progress could not be read. It has been kept untouched.');
  }
  // Additive v1 default: never rewrite a legacy save just by opening it.
  if(!Object.hasOwn(s,'order')) s.order=s.phase==='serve' ? s.drink : ['counter','served'].includes(s.phase) ? chooseOrder(s,s.drink) : null;
  if(s.order!==null && !RECIPES.some(r=>r.id===s.order))throw new Error('Saved order could not be read. It has been kept untouched.');
  return s;
}
export function applyWithEffects(storage, key, action, context) {
  const before = read(storage, key);
  const after = transition(before, action, context);
  if (after !== before) storage.setItem(key, JSON.stringify(after));
  return { state: after, made: action.type === 'make' && before.phase === 'counter' && after.phase === 'serve' && after !== before, ingredientArrived: action.type === 'complete' && before.phase === 'review' && after.phase === 'counter' && after !== before, served: action.type === 'serve' && before.phase === 'serve' && after.phase === 'served' && after.served === before.served + 1 };
}
export function apply(storage, key, action, context) {
  return applyWithEffects(storage, key, action, context).state;
}
