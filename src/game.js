// Pure state transitions: time, randomness and identity are explicit inputs.
export const INGREDIENTS = ['coffee', 'matcha', 'cocoa'];
export const RECIPES = INGREDIENTS.map((ingredient, i) => ({ id: ingredient, name: ['Iced latte', 'Iced matcha', 'Iced cocoa'][i], needs: { milk: 1, ice: 1, [ingredient]: 1 } }));
export const fresh = () => ({ version: 1, phase: 'idle', pantry: { milk: 3, ice: 3, coffee: 0, matcha: 0, cocoa: 0 }, recipes: [], receipts: [], session: null, carry: '', reward: null, drink: null, served: 0 });
export const canMake = (state, recipe) => Object.entries(recipe.needs).every(([key, count]) => state.pantry[key] >= count);
export function transition(state, action, { now, id, random = 0, demo = false } = {}) {
  const s = structuredClone(state);
  if (action.type === 'start' && s.phase === 'idle') {
    const goal = String(action.goal || '').trim().slice(0, 160);
    const duration = demo ? 10_000 : ({25: 25 * 60_000, 45: 45 * 60_000})[action.minutes];
    if (!goal || !duration || !id || !Number.isFinite(now)) return state;
    s.session = { id, goal, started: now, deadline: now + duration, duration };
    s.carry = ''; s.phase = 'focus'; s.reward = null; s.drink = null;
  } else if (action.type === 'tick' && s.phase === 'focus' && now >= s.session.deadline) {
    s.phase = 'review';
  } else if (action.type === 'carry' && ['focus', 'review'].includes(s.phase)) {
    if (!demo) s.receipts.push({ ...s.session, ended: now, status: 'carried', ingredient: null });
    s.carry = s.session.goal; s.session = null; s.phase = 'idle';
  } else if (action.type === 'complete' && s.phase === 'review' && now >= s.session.deadline) {
    // Only this transition awards; its new phase is persisted atomically with the reward.
    const ingredient = INGREDIENTS[Math.min(2, Math.max(0, Math.floor(random * 3)))];
    s.pantry[ingredient]++; s.reward = ingredient;
    // Reusable café basics are restocked after focus, keeping every reward useful long term.
    s.pantry.milk = Math.max(s.pantry.milk, 1); s.pantry.ice = Math.max(s.pantry.ice, 1);
    if (!demo) s.receipts.push({ ...s.session, ended: now, status: 'completed', ingredient });
    s.phase = 'counter';
  } else if (action.type === 'make' && s.phase === 'counter') {
    const recipe = RECIPES.find(r => r.id === action.recipe);
    if (!recipe || !canMake(s, recipe)) return state;
    for (const [key, count] of Object.entries(recipe.needs)) s.pantry[key] -= count;
    s.drink = recipe.id; s.phase = 'serve';
  } else if (action.type === 'serve' && s.phase === 'serve') {
    if (!s.recipes.includes(s.drink)) s.recipes.push(s.drink);
    s.served++; s.phase = 'served';
  } else if (action.type === 'next' && s.phase === 'served') {
    s.phase = 'idle'; s.session = null; s.reward = null; s.drink = null;
  } else return state;
  return s;
}
