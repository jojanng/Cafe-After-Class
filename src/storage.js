import { fresh, transition, chooseOrder, RECIPES, unlockOrderRecipes } from './game.js';
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
  if(!Number.isInteger(s.served) || s.served<0)throw new Error('Saved order progress could not be read. It has been kept untouched.');
  unlockOrderRecipes(s);
  s.queue ??= []; s.queueRevision ??= 0;
  if(!Array.isArray(s.queue) || s.queue.length>3 || !Number.isInteger(s.queueRevision) || s.queueRevision<0 ||
     s.queue.some(q=>!q || typeof q.id!=='string' || !q.id || typeof q.goal!=='string' || !q.goal.trim() || q.goal.length>160 || ![25,45].includes(q.minutes)) || new Set(s.queue.map(q=>q.id)).size!==s.queue.length) {
    throw new Error('Saved study queue could not be read. It has been kept untouched.');
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
  return { state: after, changed: after !== before, made: action.type === 'make' && before.phase === 'counter' && after.phase === 'serve' && after !== before, ingredientArrived: action.type === 'complete' && before.phase === 'review' && after.phase === 'counter' && after !== before, served: action.type === 'serve' && before.phase === 'serve' && after.phase === 'served' && after.served === before.served + 1 };
}
export function apply(storage, key, action, context) {
  return applyWithEffects(storage, key, action, context).state;
}
