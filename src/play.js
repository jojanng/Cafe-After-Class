import { RECIPES, recipeStatus, alternateOrder, fresh } from './game.js';
import { REAL_KEY, DEMO_KEY, read, applyWithEffects } from './storage.js';

const slip = document.querySelector('#play-slip');
const notebook = document.querySelector('#notebook');
const notice = document.querySelector('#notice');
let demo = false, state, busy = false, currentBook = null;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = () => demo ? sessionStorage : localStorage;
const key = () => demo ? DEMO_KEY : REAL_KEY;
const button = (action, text, extra='') => `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
function timeText() { const seconds = Math.max(0, Math.ceil((state.session.deadline - Date.now()) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`; }
function orderSlip() {
  const recipe=RECIPES.find(r=>r.id===state.order);
  const alternate=alternateOrder(state);
  if(!recipe)return `<h2>A moment between guests.</h2><p class="hint">No drink is ready with this pantry. A focus session brings another ingredient.</p>${button('study','Study for the next order')}`;
  const status=recipeStatus(state,recipe);
  return `<p class="order-number">ORDER ${String(state.served+1).padStart(3,'0')}</p><h2>${recipe.name}</h2><p class="hint">${status.missing.length ? `Missing: ${status.missing.map(m=>`${m.count} ${m.ingredient}`).join(', ')}` : 'Your guest is ready. So are the ingredients.'}</p>${button('make',`Make ${recipe.name.toLowerCase()}`,`data-recipe="${recipe.id}" ${status.available?'':'disabled'}`)}${alternate ? button('swap','Swap to another ready drink') : '<p class="hint">No ready alternative. Study to restock; swapping never costs ingredients.</p>'}${button('menu','Choose from the menu')}${button('study','Study for the next order')}`;
}
function studyQueue() {
  const queue=state.queue || [];
  return `<section class="study-queue" aria-label="Study queue"><p class="queue-heading">STUDY QUEUE · ${queue.length} / 3</p>${queue.length ? `<p class="hint">Next: ${escape(queue[0].goal)} · ${demo?'10 sec':`${queue[0].minutes} min`}</p>${button('start-next','Start next session',`data-queue-id="${escape(queue[0].id)}"`)}${state.phase==='idle' ? `<details><summary>View queued goals</summary><ol>${queue.map(q=>`<li><span>${escape(q.goal)} <small>${demo?'10 sec':`${q.minutes} min`}</small></span>${button('queue-remove','Remove',`data-queue-id="${escape(q.id)}" aria-label="Remove ${escape(q.goal)}"`)}</li>`).join('')}</ol></details>` : ''}` : '<p class="hint">No queued goals. Write a goal when you are ready.</p>'}<p class="hint">Timers start only when you choose.</p></section>`;
}
function newRecipeCards() {
  const unlocked=state.lastRecipeUnlocks || (state.lastServeUnlocked ? [state.drink] : []);
  return unlocked.map(id=>{const recipe=RECIPES.find(r=>r.id===id);return `<aside class="recipe-card" aria-label="New recipe"><span>NEW IN YOUR COLLECTION</span><strong>${recipe.name}</strong><small>${Object.entries(recipe.needs).map(([k,n])=>`${n} ${k}`).join(' · ')}</small></aside>`;}).join('');
}
function render() {
  document.body.classList.toggle('focusing', state.phase === 'focus');
  document.body.dataset.phase = state.phase;
  document.querySelector('#mode-label').textContent = demo ? 'DEMO · TEMPORARY PANTRY' : 'SAVED IN THIS BROWSER';
  document.querySelector('#demo-toggle').textContent = demo ? 'Leave demo' : 'Try 10-second demo';
  document.querySelector('#demo-note').hidden = !demo;
  const title = `<p class="slip-label">${demo ? 'DEMO SLIP' : 'YOUR ORDER SLIP'}</p>`;
  let body = '';
  if (state.phase === 'idle') body = `<h2>Make room for a goal.</h2>${studyQueue()}<form id="goal-form"><label for="goal">What will you work on?</label><textarea id="goal" name="goal" maxlength="160" required rows="2" placeholder="Read a chapter, work through a problem…">${escape(state.carry)}</textarea>${demo ? '<p>A 10-second practice session.</p>' : '<fieldset><legend>Focus time</legend><label><input type="radio" name="minutes" value="25" checked> 25 minutes</label><label><input type="radio" name="minutes" value="45"> 45 minutes</label></fieldset>'}<button type="submit">${demo ? 'Start demo focus' : 'Begin focus'}</button><button type="submit" name="intent" value="queue" ${state.queue.length>=3?'disabled':''}>Save to study queue</button></form><p class="hint">Focus → ingredient → make → serve.<br>Milk and ice are already in your pantry.</p>`;
  if (state.phase === 'focus') body = `<h2>${escape(state.session.goal)}</h2><p id="timer" role="timer" aria-label="Time remaining">${timeText()}</p><p class="hint">A quiet room. One thing at a time.<br>Your deadline is saved; you may leave this tab.</p>${button('carry','Carry goal forward · no reward')}`;
  if (state.phase === 'review') body = `<article class="study-receipt"><span>${demo?'PRACTICE RECEIPT':'STUDY RECEIPT'} · READY TO COLLECT</span><h2>${escape(state.session.goal)}</h2><p>${demo?'10 sec':`${state.session.duration/60000} minutes`} of focus</p><em>A little time, well spent.</em></article><p class="hint">Goal finished? Collect your receipt and ingredient. Unfinished work can come with you.</p>${button('complete','Collect receipt · goal complete')}${button('carry','Carry goal forward · no reward')}`;
  if (state.phase === 'counter') body = `${state.reward ? `<p class="ingredient-receipt" role="status">+1 ${escape(state.reward)} · Pantry: ${state.pantry[state.reward]}</p>` : ''}${orderSlip()}`;
  if (state.phase === 'serve') body = `<h2>Ready on the tray.</h2><p>${RECIPES.find(r=>r.id===state.drink).name}</p><p class="hint">One drink for your waiting guest.</p>${button('serve','Serve drink')}`;
  if (state.phase === 'served') body = `<h2>A small kindness.</h2>${newRecipeCards()}<p>Your guest enjoyed their ${RECIPES.find(r=>r.id===state.drink).name.toLowerCase()}.</p><p class="hint">Recipe saved in ${demo ? 'the demo' : 'your'} menu.</p>${button('menu','See recipe in menu')}${state.order ? `<p class="hint">Next order ${String(state.served+1).padStart(3,'0')}: ${RECIPES.find(r=>r.id===state.order).name}</p>${button('take-order','Take the next order')}` : '<p class="hint">The pantry needs a refill before another order. Your next focus session will help.</p>'}${studyQueue()}${button('next','Write the next goal')}`;
  const focused = slip.contains(document.activeElement);
  slip.innerHTML = title + body;
  if (focused) (slip.querySelector('textarea,button') || slip).focus();
  if(notebook.open && currentBook)showBook(currentBook);
  window.dispatchEvent(new CustomEvent('cafe-state', { detail: { phase: state.phase, demo, drink: state.drink, reward: state.reward } }));
}
function showBook(kind) {
  const content = notebook.querySelector('#book-content');
  currentBook=kind;
  if (kind === 'menu') content.innerHTML = `<h2 id="book-title">${demo?'Demo menu':'The little menu'}</h2><p class="collection-count">Recipe collection · ${RECIPES.filter(r=>state.recipes.includes(r.id)).length} / ${RECIPES.length}</p><p>Serve the original drinks to learn them. Fulfil 2 orders to collect Iced milk cloud.</p>${RECIPES.map(r=>{
    const status=recipeStatus(state,r);
    const availability=status.locked ? 'Locked · fulfil 2 customer orders to collect' : status.missing.length ? `Missing: ${status.missing.map(m=>`${m.count} ${m.ingredient}`).join(', ')}` : status.available ? 'Available to make · current order' : status.swappable ? 'Available as a free order swap' : state.phase==='served' && state.order===r.id ? 'Ready for the next guest · take the order at the slip' : state.phase==='serve' ? 'Ingredients ready · serve the drink on your tray first' : 'Ingredients ready · complete a focus session to make';
    return `<section class="menu-recipe" data-recipe="${r.id}"><p class="menu-state">${status.unlocked?'Unlocked':status.locked?'Locked · fulfil 2 orders':'Not yet unlocked · serve once to learn'}</p><h3>${r.name}</h3>${r.unlockOrders ? `<p class="collection-progress">${Math.min(state.served,r.unlockOrders)} / ${r.unlockOrders} fulfilled orders${status.unlocked?' · collected':''}</p><progress aria-label="Iced milk cloud unlock progress" value="${Math.min(state.served,r.unlockOrders)}" max="${r.unlockOrders}"></progress>` : ''}<p class="menu-description">${{coffee:'Roasted coffee, soft milk, clear ice.',matcha:'Green tea, soft milk, clear ice.',cocoa:'Rich cocoa, soft milk, clear ice.','milk-cloud':'Cold milk, airy milk foam, clear ice.'}[r.id]}</p><p class="menu-needs">${Object.entries(r.needs).map(([k,n])=>`${n} ${k} (${state.pantry[k]} in pantry)`).join(' · ')}</p><p class="menu-availability">${availability}</p>${status.swappable ? button('swap',`Swap order to ${r.name.toLowerCase()}`,`data-recipe="${r.id}"`) : button('make',`Make ${r.name.toLowerCase()}`,`data-recipe="${r.id}" ${status.available?'':'disabled'}`)}</section>`;
  }).join('')}`;
  if (kind === 'pantry') content.innerHTML = `<h2 id="book-title">${demo?'Demo pantry':'In the pantry'}</h2><ul>${Object.entries(state.pantry).map(([k,v])=>`<li>${k}<strong>${v}</strong></li>`).join('')}</ul><p>Each focus reward is coffee, matcha, or cocoa. Milk and ice are topped up to at least one after focus.</p>`;
  if (kind === 'receipts') {
    const receipts=demo ? state.demoReceipts || [] : state.receipts;
    content.innerHTML=`<h2 id="book-title">${demo?'Demo receipt book':'The receipt book'}</h2>${demo?'<p>Temporary practice receipts. Your real study book stays unchanged.</p>':''}${receipts.length ? receipts.slice().reverse().map(r=>`<section><p>${escape(new Date(r.ended).toLocaleString())} · ${r.duration<60000?`${r.duration/1000} sec`:`${r.duration/60000} min`} planned</p><h3>${escape(r.goal)}</h3><p>${r.status==='completed'?`Collected · +1 ${escape(r.ingredient)}`:'Carried forward · no reward'}</p></section>`).join('') : '<p>No collected receipts yet. Finish a focus session and collect the paper on your slip.</p>'}`;
  }
  if(!notebook.open)notebook.showModal();
}
function receiptPickup(snapshot) {
  window.dispatchEvent(new CustomEvent('cafe-receipt-collected'));
  if(!snapshot || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const {paper,rect}=snapshot;
  paper.classList.add('receipt-pickup');paper.setAttribute('aria-hidden','true');
  Object.assign(paper.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  document.body.append(paper);
  const animation=paper.animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:'translateY(-26px) rotate(-3deg) scale(.96)',opacity:1,offset:.75},{transform:'translateY(-36px) rotate(-5deg) scale(.92)',opacity:0}],{duration:380,easing:'ease-in',fill:'forwards'});
  animation.finished.catch(()=>{}).finally(()=>paper.remove());
}
async function act(action) {
  if (busy) return;
  busy = true;
  const paper=action.type==='complete' ? slip.querySelector('.study-receipt') : null;
  const pickup=paper ? {paper:paper.cloneNode(true),rect:paper.getBoundingClientRect()} : null;
  if(['complete','carry'].includes(action.type))action={...action,expectedSession:state.session?.id};
  if(['queue-add','queue-remove','start-next'].includes(action.type))action={...action,expectedQueueRevision:state.queueRevision};
  if(['make','serve','swap','take-order','study','next','start-next'].includes(action.type))action={...action,expectedServed:state.served};
  try {
    if (!navigator.locks) throw new Error('Saving safely requires a modern browser on localhost or HTTPS.');
    let served = false, ingredientArrived = false, made = false, changed = false;
    await navigator.locks.request('cafe-progress', () => {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2**32;
      const result = applyWithEffects(store(), key(), action, { now: Date.now(), id: crypto.randomUUID(), random, demo });
      state = result.state; changed = result.changed; served = result.served; ingredientArrived = result.ingredientArrived; made = result.made;
    });
    notice.textContent = ''; render();
    if(action.type==='queue-add' && !changed && state.phase==='idle') {
      restoreDraft({goal:action.goal,minutes:action.minutes});
      notice.textContent='The queue changed or is full. Your goal is still here; review the queue and save again.';
    }
    if(action.type==='make' && state.phase==='serve' && notebook.open){notebook.close();slip.querySelector('[data-action="serve"]').focus();}
    if(action.type==='swap' && notebook.open){notebook.close();slip.querySelector('[data-action="make"]')?.focus();}
    if(made)window.dispatchEvent(new CustomEvent('cafe-prepare-saved'));
    if (ingredientArrived) {
      receiptPickup(pickup);
      notice.textContent = `Receipt collected. Received one ${state.reward}. Pantry: ${state.pantry[state.reward]}.`;
      window.dispatchEvent(new CustomEvent('cafe-ingredient-saved'));
    }
    if (served) {
      notice.textContent = state.lastRecipeUnlocks?.length ? 'Drink served. New recipe in your menu.' : 'Drink served.';
      window.dispatchEvent(new CustomEvent('cafe-serve-saved'));
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for(const card of slip.querySelectorAll('.recipe-card')) {
        card.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:220,delay:480,easing:'ease-out',fill:'backwards'});
      }
    }
  } catch (error) { notice.textContent = `Could not save: ${error.message} Progress was not advanced on screen.`; }
  finally { busy = false; }
}
slip.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); act({ type:event.submitter?.value==='queue'?'queue-add':'start', goal:data.get('goal'), minutes:Number(data.get('minutes')) }); });
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target) return;
  const type = target.dataset.action;
  if (['menu','pantry','receipts'].includes(type)) return showBook(type);
  act({type, recipe:target.dataset.recipe, queueId:target.dataset.queueId});
});
document.querySelector('#close-book').onclick = () => notebook.close();
document.querySelector('#demo-toggle').onclick = () => {
  if (busy) return;
  try {
    if (!demo) sessionStorage.setItem(DEMO_KEY, JSON.stringify(fresh()));
    demo = !demo; state = read(store(),key()); render();
    notice.textContent = demo ? 'Demo only: no real receipts or permanent rewards.' : 'Returned to your real progress.';
    checkTime();
  } catch(error) { notice.textContent = error.message; }
};
function checkTime() {
  if (!state) return;
  if (state.phase === 'focus') {
    const timer = document.querySelector('#timer'); if (timer) timer.textContent = timeText();
    if (Date.now() >= state.session.deadline) act({type:'tick'});
  }
}
function restoreDraft(draft) {
  const goal=document.querySelector('#goal');if(!goal)return;
  goal.value=draft.goal;
  const duration=document.querySelector(`input[name="minutes"][value="${draft.minutes}"]`);if(duration)duration.checked=true;
}
window.addEventListener('storage', event => {
  if(event.key!==REAL_KEY || demo)return;
  const draft=state.phase==='idle' ? {goal:document.querySelector('#goal')?.value || '',minutes:Number(document.querySelector('input[name="minutes"]:checked')?.value)} : null;
  try {state=read(localStorage,REAL_KEY);render();if(draft && state.phase==='idle')restoreDraft(draft);checkTime();}
  catch(error){notice.textContent=error.message;}
});
document.addEventListener('visibilitychange', checkTime);
try { state=read(localStorage,REAL_KEY); render();checkTime(); } catch(error) { notice.textContent=error.message; }
setInterval(checkTime, 1000);
