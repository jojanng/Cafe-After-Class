// Pure state transitions: time, randomness and identity are explicit inputs.
export const INGREDIENTS = ['coffee', 'matcha', 'cocoa'];
export const RECIPES = INGREDIENTS.map((ingredient, i) => ({ id: ingredient, name: ['Iced latte', 'Iced matcha latte', 'Iced cocoa'][i], needs: { milk: 1, ice: 1, [ingredient]: 1 } }));
export const fresh = () => ({ version: 1, phase: 'idle', pantry: { milk: 3, ice: 3, coffee: 0, matcha: 0, cocoa: 0 }, recipes: [], receipts: [], session: null, carry: '', reward: null, drink: null, served: 0, order: null });
export const canMake = (state, recipe) => Object.entries(recipe.needs).every(([key, count]) => state.pantry[key] >= count);
// Favor a different feasible drink, then learned recipes; new recipes remain discoverable.
export function chooseOrder(state, previous = null) {
  const feasible=RECIPES.filter(r=>canMake(state,r));
  const different=feasible.filter(r=>r.id!==previous);
  const candidates=different.length ? different : feasible;
  return (candidates.find(r=>state.recipes.includes(r.id)) || candidates[0])?.id || null;
}
export function alternateOrder(state) {
  const candidate=chooseOrder(state,state.order);
  return candidate!==state.order ? candidate : null;
}
// One shared read model for both counter shortcuts and the paper menu.
export function recipeStatus(state, recipe) {
  const missing=Object.entries(recipe.needs).flatMap(([ingredient,quantity]) => {
    const count=Math.max(0,quantity-state.pantry[ingredient]);
    return count ? [{ingredient,count}] : [];
  });
  return { unlocked:state.recipes.includes(recipe.id), missing,
    ingredientsReady:missing.length===0,
    available:state.phase==='counter' && missing.length===0 && state.order===recipe.id,
    swappable:state.phase==='counter' && missing.length===0 && state.order!==recipe.id };
}
export function transition(state, action, { now, id, random = 0, demo = false } = {}) {
  // Reject an order action queued by a tab still showing an earlier guest.
  if(action.expectedServed !== undefined && action.expectedServed !== state.served)return state;
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
    s.order ||= chooseOrder(s,s.drink);
    s.phase = 'counter';
  } else if (action.type === 'make' && s.phase === 'counter') {
    const recipe = RECIPES.find(r => r.id === action.recipe);
    if (!recipe || recipe.id !== s.order || !canMake(s, recipe)) return state;
    for (const [key, count] of Object.entries(recipe.needs)) s.pantry[key] -= count;
    s.drink = recipe.id; s.phase = 'serve';
  } else if (action.type === 'serve' && s.phase === 'serve') {
    s.lastServeUnlocked = !s.recipes.includes(s.drink);
    if (s.lastServeUnlocked) s.recipes.push(s.drink);
    s.served++; s.phase = 'served';
    s.order = chooseOrder(s,s.drink);
  } else if (action.type === 'swap' && s.phase === 'counter') {
    const candidate=action.recipe || alternateOrder(s);
    const recipe=RECIPES.find(r=>r.id===candidate);
    if(!recipe || candidate===s.order || !canMake(s,recipe))return state;
    s.order=candidate;
  } else if(action.type==='take-order' && s.phase==='served') {
    if(!s.order || !canMake(s,RECIPES.find(r=>r.id===s.order)))return state;
    s.phase='counter';s.drink=null;s.reward=null;
  } else if ((action.type === 'next' && s.phase === 'served') || (action.type==='study' && s.phase==='counter')) {
    s.phase = 'idle'; s.session = null; s.reward = null; s.drink = null;
  } else return state;
  return s;
}
