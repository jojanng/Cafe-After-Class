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
  if (!recipe) return '<div class="phase-info"><h2>Time to restock.</h2></div><div class="actions">'+button('study','Study for the next order','class="primary"')+'</div>';
  const status=recipeStatus(state,recipe);
  const alternate=alternateOrder(state);
  const make=button('make',`Make ${recipe.name.toLowerCase()}`,`data-recipe="${recipe.id}" ${status.available?'class="primary"':'disabled'}`);
  const swap=alternate ? button('swap','Swap to another ready drink',status.available?'':'class="primary"') : '';
  const study=button('study','Study for the next order',(!status.available && !alternate)?'class="primary"':'');
  const missing=status.missing.map(m=>`${m.count} ${m.ingredient}`).join(', ');
  const reward=state.reward ? `<p class="ingredient-receipt">+1 ${escape(state.reward)} · Pantry: ${state.pantry[state.reward]}</p>` : '';
  return `<div class="phase-info"><p class="kicker order-number">Order ${String(state.served+1).padStart(3,'0')}</p><h2>${recipe.name}</h2>${reward}${missing?`<p>Missing: ${missing}</p>`:''}</div>
    <div class="actions">${status.available?make:alternate?swap:study}<div class="secondary">${status.available?swap:make}${button('menu','Choose from the menu')}${status.available||alternate?study:''}</div></div>`;
}
function nextSession(primary=false) {
  return button('start-next','Start next session',`data-queue-id="${escape(state.queue[0].id)}" ${primary?'class="primary"':''}`);
}
function studyQueue() {
  if (!state.queue?.length) return '';
  return `<section class="study-queue" aria-label="Study queue"><details><summary class="queue-heading">Study queue · ${state.queue.length} / 3</summary>
    <ol>${state.queue.map(q=>`<li><span>${escape(q.goal)} <small>${demo?'10 sec':q.minutes+' min'}</small></span>${state.phase==='idle'?button('queue-remove','Remove',`data-queue-id="${escape(q.id)}" aria-label="Remove ${escape(q.goal)}"`):''}</li>`).join('')}</ol>
    </details>${state.phase==='idle'?nextSession():''}</section>`;
}
function newRecipeCards() {
  const unlocked=state.lastRecipeUnlocks || (state.lastServeUnlocked ? [state.drink] : []);
  return unlocked.flatMap(id=>{
    const recipe=RECIPES.find(r=>r.id===id);
    if (!recipe) return [];
    const learned = id===state.drink ? 'Recipe learned' : `Learned · ${recipe.name}`;
    return [`<span class="recipe-card">${learned}</span>`];
  }).join('');
}
function servedSlip() {
  const nextOrder=RECIPES.find(r=>r.id===state.order);
  const queued=!!state.queue?.length;
  const writeGoal=button('next','Write the next goal',nextOrder||queued?'':'class="primary"');
  const primary=nextOrder ? button('take-order','Take the next order','class="primary"') :
    queued ? nextSession(true) : writeGoal;
  const options=[nextOrder&&queued?nextSession():'',nextOrder||queued?writeGoal:'',button('menu','See recipe in menu')].join('');
  const drink=RECIPES.find(r=>r.id===state.drink)?.name || 'Drink';
  const nextText=nextOrder?`Next order · ${nextOrder.name}`:queued?`Next goal · ${escape(state.queue[0].goal)}`:'';
  return `<div class="phase-info"><p class="kicker">Order served</p><h2>${drink}</h2><div class="collection-note">${newRecipeCards()}</div></div>
    <div class="actions">${nextText?`<p class="next-up">${nextText}</p>`:''}${primary}<div class="secondary">${options}</div></div>${studyQueue()}`;
}
function idleSlip() {
  return `<form id="goal-form">
    <div class="goal-entry"><label for="goal">What will you work on?</label><textarea id="goal" name="goal" maxlength="160" required rows="1" placeholder="Write a study goal…">${escape(state.carry)}</textarea></div>
    ${demo?'':'<fieldset><legend>Focus time</legend><div class="durations"><label><input type="radio" name="minutes" value="25" checked><span>25 min</span></label><label><input type="radio" name="minutes" value="45"><span>45 min</span></label></div></fieldset>'}
    <div class="actions"><button class="primary" type="submit">${demo?'Start demo focus':'Begin focus'}</button><button type="submit" name="intent" value="queue" ${state.queue.length>=3?'disabled':''}>Save to study queue</button></div>
    </form>${studyQueue()}`;
}
function render() {
  document.body.dataset.phase = state.phase;
  document.body.classList.toggle('demo',demo);
  document.querySelector('#demo-note').hidden=!demo;
  const demoToggle=document.querySelector('#demo-toggle');
  demoToggle.textContent=demo?'Leave demo':'Try 10-second demo';
  demoToggle.setAttribute('aria-pressed',String(demo));
  const phase=state.phase;
  let body='';
  if (phase==='idle') body=idleSlip();
  if (phase==='focus') body=`<div class="phase-info"><p class="kicker">${demo?'Practice focus':'In focus'}</p><h2>${escape(state.session.goal)}</h2></div><div class="actions"><p id="timer" tabindex="-1" role="timer" aria-label="Time remaining">${timeText()}</p>${button('carry','Carry goal forward · no reward')}</div>`;
  if (phase==='review') body=`<article class="phase-info study-receipt"><p class="kicker">${demo?'Practice receipt':'Study receipt'}</p><h2>${escape(state.session.goal)}</h2><p>${demo?'10 sec':state.session.duration/60000+' minutes'} of focus</p></article><div class="actions">${button('complete','Collect receipt · goal complete','class="primary"')}${button('carry','Carry goal forward · no reward')}</div>`;
  if (phase==='counter') body=orderSlip();
  if (phase==='serve') body=`<div class="phase-info"><p class="kicker">Ready on the tray</p><h2>${RECIPES.find(r=>r.id===state.drink).name}</h2></div><div class="actions">${button('serve','Serve drink','class="primary"')}</div>`;
  if (phase==='served') body=servedSlip();
  const active=document.activeElement;
  const focused=slip.contains(active);
  const queueOpen=slip.querySelector('.study-queue details')?.open;
  const samePhase=phase===slip.dataset.phase;
  slip.innerHTML=body;
  slip.dataset.phase=phase;
  const details=slip.querySelector('.study-queue details');
  if (details && queueOpen && samePhase) details.open=true;
  if (focused) {
    let target;
    if (samePhase) {
      if (active.id) target=document.getElementById(active.id);
      else if (active.matches('summary')) target=slip.querySelector('summary');
      else if (active.name) target=Array.from(slip.querySelectorAll('[name]')).find(e=>e.name===active.name && e.value===active.value);
      else if (active.dataset.action) target=Array.from(slip.querySelectorAll('[data-action]')).find(e=>e.dataset.action===active.dataset.action && e.dataset.queueId===active.dataset.queueId);
    }
    if (!target || target.disabled) target=slip.querySelector('#goal, #timer') || slip.querySelector('.primary');
    (target || slip).focus();
  }
  if (notebook.open && currentBook) showBook(currentBook);
  window.dispatchEvent(new CustomEvent('cafe-state',{detail:{phase,demo,drink:state.drink,reward:state.reward}}));
}
function showBook(kind) {
  const content = notebook.querySelector('#book-content');
  const previous = content.contains(document.activeElement) ? document.activeElement : null;
  currentBook=kind;
  const menuRecipes=RECIPES.filter(r=>!r.legacyOnly || state.recipes.includes(r.id));
  if (kind === 'menu') content.innerHTML = `<h2 id="book-title">${demo?'Demo menu':'The little menu'}</h2><p class="collection-count">Recipe collection · ${menuRecipes.filter(r=>state.recipes.includes(r.id)).length} / ${menuRecipes.length}</p>${menuRecipes.map(r=>{
    const status=recipeStatus(state,r);
    const missing=status.missing.map(m=>`${m.count} ${m.ingredient}`).join(', ');
    let availability='';
    if (missing) availability=`Missing: ${missing}`;
    else if (status.swappable) availability='Free order swap';
    else if (!status.available && !status.locked) {
      if (state.phase==='served' && state.order===r.id) availability='Ready for the next guest';
      else if (state.phase==='serve') availability='Serve the drink on the tray first';
      else availability='Ingredients ready for a future order';
    }
    const collected=Math.min(state.served,r.unlockOrders || 0);
    const progress=r.unlockOrders ? `<p class="collection-progress">${collected} / ${r.unlockOrders} fulfilled orders</p><progress aria-label="${r.name} unlock progress" value="${collected}" max="${r.unlockOrders}"></progress>` : '';
    const needs=Object.entries(r.needs).map(([k,n])=>`${n} ${k} (${state.pantry[k]} in pantry)`).join(' · ');
    const action=status.swappable ? button('swap',`Swap order to ${r.name.toLowerCase()}`,`data-recipe="${r.id}"`) :
      button('make',`Make ${r.name.toLowerCase()}`,`data-recipe="${r.id}" ${status.available?'':'disabled'}`);
    return `<section class="menu-recipe" data-recipe="${r.id}"><p class="menu-state">${status.unlocked?'Unlocked':status.locked?'Locked':'Serve once to learn'}</p>
      <h3>${r.name}</h3>${progress}<p class="menu-needs">${needs}</p>${availability?`<p class="menu-availability">${availability}</p>`:''}${action}</section>`;
  }).join('')}`;
  if (kind === 'pantry') content.innerHTML = `<h2 id="book-title">${demo?'Demo pantry':'In the pantry'}</h2><ul>${Object.entries(state.pantry).map(([k,v])=>`<li>${k}<strong>${v}</strong></li>`).join('')}</ul><p>Each focus reward is coffee, matcha, or cocoa. Milk and ice are topped up to at least one after focus.</p>`;
  if (kind === 'receipts') {
    const receipts=demo ? state.demoReceipts || [] : state.receipts;
    content.innerHTML=`<h2 id="book-title">${demo?'Demo receipt book':'The receipt book'}</h2>${demo?'<p>Temporary practice receipts. Your real study book stays unchanged.</p>':''}${receipts.length ? receipts.slice().reverse().map(r=>`<section><p>${escape(new Date(r.ended).toLocaleString())} · ${r.duration<60000?`${r.duration/1000} sec`:`${r.duration/60000} min`} planned</p><h3>${escape(r.goal)}</h3><p>${r.status==='completed'?`Collected · +1 ${escape(r.ingredient)}`:'Carried forward · no reward'}</p></section>`).join('') : '<p>No collected receipts yet. Finish a focus session and collect the paper on your slip.</p>'}`;
  }
  if (!notebook.open) notebook.showModal();
  else if (previous) {
    const buttons=Array.from(content.querySelectorAll('button:enabled'));
    const matching=buttons.find(b=>b.dataset.recipe===previous.dataset.recipe && b.dataset.action===previous.dataset.action);
    (matching || notebook.querySelector('#close-book')).focus({preventScroll:true});
  }
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
let saveObserver;
async function saveAction(action) {
  const storage=store(), saveKey=key();
  const random=crypto.getRandomValues(new Uint32Array(1))[0]/2**32;
  const context={now:Date.now(),id:crypto.randomUUID(),random,demo};
  if (demo) return applyWithEffects(storage,saveKey,action,context);
  // localStorage is cached per renderer. Keep the write lock through the browser's
  // storage notification so the next tab can read the committed queue or receipt.
  // A same-origin blank document receives our own writes. The writing window does not.
  if (!saveObserver) {
    const observer=document.createElement('iframe');
    observer.hidden=true;
    observer.tabIndex=-1;
    document.body.append(observer);
    saveObserver=observer.contentWindow;
  }
  const before=saveObserver.localStorage.getItem(saveKey);
  let saved, confirm;
  const observed=new Promise(resolve=>{confirm=resolve;});
  function onStorage(event) {
    if (event.key===saveKey && event.newValue===saved) confirm();
  }
  saveObserver.addEventListener('storage',onStorage);
  try {
    const result=applyWithEffects(storage,saveKey,action,context);
    saved=storage.getItem(saveKey);
    if (result.changed && saved!==before) await observed;
    return result;
  } finally {
    saveObserver.removeEventListener('storage',onStorage);
  }
}
async function act(action) {
  if (busy) return {error:'Another action is being saved.'};
  busy = true;
  const paper=action.type==='complete' ? slip.querySelector('.study-receipt') : null;
  const pickup=paper ? {paper:paper.cloneNode(true),rect:paper.getBoundingClientRect()} : null;
  if(['complete','carry'].includes(action.type))action={...action,expectedSession:state.session?.id};
  if(['queue-add','queue-remove','start-next'].includes(action.type))action={...action,expectedQueueRevision:state.queueRevision};
  if(['make','serve','swap','take-order','study','next','start-next'].includes(action.type))action={...action,expectedServed:state.served};
  try {
    if (!navigator.locks) throw new Error('Saving safely requires a modern browser on localhost or HTTPS.');
    const {state:nextState, served, ingredientArrived, made, changed}=await navigator.locks.request('cafe-progress',()=>saveAction(action));
    state=nextState;
    notice.textContent = ''; notice.classList.remove('problem'); render();
    if(action.type==='queue-add' && !changed && state.phase==='idle') {
      restoreDraft({goal:action.goal,minutes:action.minutes});
      notice.classList.add('problem'); notice.textContent='The queue changed or is full. Your goal is still here; review the queue and save again.';
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
      notice.textContent = `Drink served.${state.lastRecipeUnlocks?.length?' New recipe in your menu.':''}`;
      window.dispatchEvent(new CustomEvent('cafe-serve-saved'));
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) for(const card of slip.querySelectorAll('.recipe-card')) {
        card.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:220,delay:480,easing:'ease-out',fill:'backwards'});
      }
    }
    return {changed};
  } catch (error) { notice.classList.add('problem'); notice.textContent = `Could not save: ${error.message} Progress was not advanced on screen.`;return {error:error.message}; }
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
notebook.addEventListener('close', () => {
  if (document.activeElement===document.body) (slip.querySelector('#goal, #timer') || slip.querySelector('.primary') || slip).focus();
});
document.querySelector('#demo-toggle').onclick = () => {
  if (busy) return;
  try {
    if (!demo) sessionStorage.setItem(DEMO_KEY, JSON.stringify(fresh()));
    demo = !demo; state = read(store(),key()); render();
    notice.classList.remove('problem');
    notice.textContent = demo ? 'Demo only: no real receipts or permanent rewards.' : 'Returned to your real progress.';
    checkTime();
  } catch(error) { notice.classList.add('problem'); notice.textContent = error.message; }
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
  if (draft.selection) goal.setSelectionRange(...draft.selection);
  const duration=document.querySelector(`input[name="minutes"][value="${draft.minutes}"]`);if(duration)duration.checked=true;
}
window.addEventListener('storage', event => {
  if(event.key!==REAL_KEY || demo)return;
  const goal=slip.querySelector('#goal');
  const draft=goal ? {goal:goal.value,minutes:Number(slip.querySelector('input[name="minutes"]:checked')?.value),
    selection:document.activeElement===goal ? [goal.selectionStart,goal.selectionEnd,goal.selectionDirection] : null} : null;
  try {state=read(localStorage,REAL_KEY);render();if(draft && state.phase==='idle')restoreDraft(draft);checkTime();}
  catch(error){notice.classList.add('problem'); notice.textContent=error.message;}
});
document.addEventListener('visibilitychange', checkTime);
try { state=read(localStorage,REAL_KEY); render();checkTime(); } catch(error) { notice.classList.add('problem'); notice.textContent=error.message; }
setInterval(checkTime, 1000);
