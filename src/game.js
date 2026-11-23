import {freshEconomy,shopTransition} from './catalog.js';
import {freshEnvironment,editEnvironment} from './environment.js';
// Pure state transitions: time, randomness and identity are explicit inputs.
export const INGREDIENTS = ['coffee', 'matcha', 'cocoa'];
export const RECIPES = [
  ...INGREDIENTS.map((ingredient, i) => ({ id: ingredient, name: ['Iced latte', 'Iced matcha latte', 'Iced cocoa'][i], needs: { milk: 1, ice: 1, [ingredient]: 1 } })),
  { id:'milk-cloud', name:'Iced milk cloud', needs:{milk:1,ice:1}, unlockOrders:2 },
  { id:'shaken-latte', name:'Iced shaken latte', needs:{milk:1,ice:1,coffee:1}, shopItem:'recipe-shaken', serveValue:10 }
];
export const recipeEligible = (state, recipe) => !!recipe && (!recipe.shopItem || state.economy?.owned.includes(recipe.shopItem)) && (!recipe.unlockOrders || state.recipes.includes(recipe.id));
export function unlockOrderRecipes(state) {
  const unlocked=RECIPES.filter(r=>r.unlockOrders && state.served>=r.unlockOrders && !state.recipes.includes(r.id)).map(r=>r.id);
  state.recipes.push(...unlocked);
  return unlocked;
}
export const fresh = () => ({ version: 1, phase: 'idle', pantry: { milk: 3, ice: 3, coffee: 0, matcha: 0, cocoa: 0 }, recipes: [], receipts: [], session: null, carry: '', reward: null, drink: null, served: 0, order: null, demoReceipts: [], queue: [], queueRevision: 0, environment:freshEnvironment(), environmentUndo:null, economy:freshEconomy() });
export const canMake = (state, recipe) => recipeEligible(state,recipe) && Object.entries(recipe.needs).every(([key, count]) => state.pantry[key] >= count);
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
  return { unlocked:state.recipes.includes(recipe.id), locked:!recipeEligible(state,recipe), missing,
    ingredientsReady:missing.length===0,
    available:recipeEligible(state,recipe) && state.phase==='counter' && missing.length===0 && state.order===recipe.id,
    swappable:recipeEligible(state,recipe) && state.phase==='counter' && missing.length===0 && state.order!==recipe.id };
}
export function transition(state, action, { now, id, random = 0, demo = false } = {}) {
  if(['purchase','demo-supplies'].includes(action.type))return shopTransition(state,action,{id,now,demo});
  if(['layout-save','layout-undo'].includes(action.type))return editEnvironment(state,action);
  // Reject an order action queued by a tab still showing an earlier guest.
  if(action.expectedServed !== undefined && action.expectedServed !== state.served)return state;
  if(action.expectedSession !== undefined && action.expectedSession !== state.session?.id)return state;
  if(action.expectedQueueRevision !== undefined && action.expectedQueueRevision !== (state.queueRevision || 0))return state;
  const s = structuredClone(state);
  s.queue ||= []; s.queueRevision ||= 0;
  if(action.type==='queue-add' && s.phase==='idle') {
    const goal=String(action.goal || '').trim().slice(0,160);
    const minutes=demo ? 25 : action.minutes;
    if(!goal || ![25,45].includes(minutes) || !id || s.queue.length>=3 || s.queue.some(q=>q.id===id))return state;
    s.queue.push({id,goal,minutes});s.queueRevision++;
    if(s.carry===goal)s.carry='';
  } else if(action.type==='queue-remove' && s.phase==='idle') {
    const index=s.queue.findIndex(q=>q.id===action.queueId);
    if(index<0)return state;
    s.queue.splice(index,1);s.queueRevision++;
  } else if ((action.type === 'start' && s.phase === 'idle') || (action.type==='start-next' && ['idle','served'].includes(s.phase))) {
    if(action.type==='start-next') {
      const queued=s.queue[0];
      if(!queued || action.queueId!==queued.id)return state;
      action={...action,goal:queued.goal,minutes:queued.minutes};
    }
    const goal = String(action.goal || '').trim().slice(0, 160);
    const duration = demo ? 10_000 : ({25: 25 * 60_000, 45: 45 * 60_000})[action.minutes];
    if (!goal || !duration || !id || !Number.isFinite(now)) return state;
    if(action.type==='start-next'){s.queue.shift();s.queueRevision++;}
    s.session = { id, goal, started: now, deadline: now + duration, duration };
    if(s.carry===goal)s.carry='';
    s.phase = 'focus'; s.reward = null; s.drink = null;
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
    const receipt={ ...s.session, ended: now, collectedAt: now, status: 'completed', ingredient };
    if (demo) { s.demoReceipts ||= []; s.demoReceipts.push({ ...receipt, demo: true }); }
    else s.receipts.push(receipt);
    s.order ||= chooseOrder(s,s.drink);
    s.phase = 'counter';
  } else if (action.type === 'make' && s.phase === 'counter') {
    const recipe = RECIPES.find(r => r.id === action.recipe);
    if (!recipe || recipe.id !== s.order || !canMake(s, recipe)) return state;
    for (const [key, count] of Object.entries(recipe.needs)) s.pantry[key] -= count;
    s.drink = recipe.id; s.phase = 'serve';
  } else if (action.type === 'serve' && s.phase === 'serve') {
    s.lastServeUnlocked = !s.recipes.includes(s.drink);
    s.lastRecipeUnlocks=s.lastServeUnlocked ? [s.drink] : [];
    if (s.lastServeUnlocked) s.recipes.push(s.drink);
    s.served++; s.phase = 'served';
    s.economy ||= freshEconomy(s.served-1);
    s.lastEarning=RECIPES.find(r=>r.id===s.drink)?.serveValue || 10;
    s.economy.balance+=s.lastEarning;s.economy.earned+=s.lastEarning;
    s.lastRecipeUnlocks.push(...unlockOrderRecipes(s));
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
