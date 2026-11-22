import { fresh, transition } from './game.js';
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
  return s;
}
export function apply(storage, key, action, context) {
  const before = read(storage, key);
  const after = transition(before, action, context);
  if (after !== before) storage.setItem(key, JSON.stringify(after));
  return after;
}
