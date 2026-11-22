import { RECIPES, canMake, fresh } from './game.js';
import { REAL_KEY, DEMO_KEY, read, apply } from './storage.js';

const slip = document.querySelector('#play-slip');
const notebook = document.querySelector('#notebook');
const notice = document.querySelector('#notice');
let demo = false, state, busy = false;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = () => demo ? sessionStorage : localStorage;
const key = () => demo ? DEMO_KEY : REAL_KEY;
const button = (action, text, extra='') => `<button type="button" data-action="${action}" ${extra}>${text}</button>`;
function timeText() { const seconds = Math.max(0, Math.ceil((state.session.deadline - Date.now()) / 1000)); return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`; }
function render() {
  document.body.classList.toggle('focusing', state.phase === 'focus');
  document.body.dataset.phase = state.phase;
  document.querySelector('#mode-label').textContent = demo ? 'DEMO · TEMPORARY PANTRY' : 'SAVED IN THIS BROWSER';
  document.querySelector('#demo-toggle').textContent = demo ? 'Leave demo' : 'Try 10-second demo';
  document.querySelector('#demo-note').hidden = !demo;
  const title = `<p class="slip-label">${demo ? 'DEMO SLIP' : 'YOUR ORDER SLIP'}</p>`;
  let body = '';
  if (state.phase === 'idle') body = `<h2>Make room for a goal.</h2><form id="goal-form"><label for="goal">What will you work on?</label><textarea id="goal" name="goal" maxlength="160" required rows="2" placeholder="Read a chapter, work through a problem…">${escape(state.carry)}</textarea>${demo ? '<p>A 10-second practice session.</p>' : '<fieldset><legend>Focus time</legend><label><input type="radio" name="minutes" value="25" checked> 25 minutes</label><label><input type="radio" name="minutes" value="45"> 45 minutes</label></fieldset>'}<button type="submit">${demo ? 'Start demo focus' : 'Begin focus'}</button></form><p class="hint">Focus → ingredient → make → serve.<br>Milk and ice are already in your pantry.</p>`;
  if (state.phase === 'focus') body = `<h2>${escape(state.session.goal)}</h2><p id="timer" role="timer" aria-label="Time remaining">${timeText()}</p><p class="hint">A quiet room. One thing at a time.<br>Your deadline is saved; you may leave this tab.</p>${button('carry','Carry goal forward · no reward')}`;
  if (state.phase === 'review') body = `<h2>Your focus time is complete.</h2><p>${escape(state.session.goal)}</p><p class="hint">Did you finish your goal? Unfinished work can come with you.</p>${button('complete','Goal complete · receive ingredient')}${button('carry','Carry goal forward · no reward')}`;
  if (state.phase === 'counter') body = `<h2>A little ${escape(state.reward)}.</h2><p>One random ingredient, earned by your focus.</p><p class="hint">Your guest would love any cold drink. Make one with your pantry.</p>${RECIPES.map(r=>button('make',`Make ${r.name.toLowerCase()}`,`data-recipe="${r.id}" ${canMake(state,r)?'':'disabled'}`)).join('')}<p class="hint">Each drink: 1 milk + 1 ice + 1 flavor.</p>`;
  if (state.phase === 'serve') body = `<h2>Ready on the tray.</h2><p>${RECIPES.find(r=>r.id===state.drink).name}</p><p class="hint">One drink for your waiting guest.</p>${button('serve','Serve drink')}`;
  if (state.phase === 'served') body = `<h2>A small kindness.</h2><p>Your guest enjoyed their ${RECIPES.find(r=>r.id===state.drink).name.toLowerCase()}.</p><p class="hint">Recipe saved in ${demo ? 'the demo' : 'your'} menu.</p>${button('menu','See recipe in menu')}${button('next','Write the next goal')}`;
  const focused = slip.contains(document.activeElement);
  slip.innerHTML = title + body;
  if (focused) (slip.querySelector('textarea,button') || slip).focus();
  window.dispatchEvent(new CustomEvent('cafe-state', { detail: { phase: state.phase, drink: state.drink, reward: state.reward } }));
}
function showBook(kind) {
  const content = notebook.querySelector('#book-content');
  if (kind === 'menu') content.innerHTML = `<h2 id="book-title">${demo?'Demo menu':'The little menu'}</h2><p>Recipes are learned by making and serving.</p>${RECIPES.map(r=>`<section><h3>${state.recipes.includes(r.id)?r.name:'Recipe to discover'}</h3><p>${state.recipes.includes(r.id)?`1 milk · 1 ice · 1 ${r.id}`:'Serve a new drink to write it here.'}</p></section>`).join('')}`;
  if (kind === 'pantry') content.innerHTML = `<h2 id="book-title">${demo?'Demo pantry':'In the pantry'}</h2><ul>${Object.entries(state.pantry).map(([k,v])=>`<li>${k}<strong>${v}</strong></li>`).join('')}</ul><p>Each focus reward is coffee, matcha, or cocoa. Milk and ice are topped up to at least one after focus.</p>`;
  if (kind === 'receipts') content.innerHTML = `<h2 id="book-title">The receipt book</h2>${demo ? '<p>The demo never writes study receipts.</p>' : state.receipts.length ? state.receipts.slice().reverse().map(r=>`<section><p>${escape(new Date(r.ended).toLocaleString())} · ${r.duration / 60000} min planned</p><h3>${escape(r.goal)}</h3><p>${r.status==='completed'?`Completed · +1 ${escape(r.ingredient)}`:'Carried forward · no reward'}</p></section>`).join('') : '<p>Your real study sessions will be recorded here. Carried goals are marked unfinished and earn no reward.</p>'}`;
  notebook.showModal();
}
async function act(action) {
  if (busy) return;
  busy = true;
  try {
    if (!navigator.locks) throw new Error('Saving safely requires a modern browser on localhost or HTTPS.');
    await navigator.locks.request('cafe-progress', () => {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2**32;
      state = apply(store(), key(), action, { now: Date.now(), id: crypto.randomUUID(), random, demo });
    });
    notice.textContent = ''; render();
    if (action.type === 'complete') notice.textContent = `Received one ${state.reward}.`;
    if (action.type === 'serve') notice.textContent = 'Drink served. Recipe is in your menu.';
  } catch (error) { notice.textContent = `Could not save: ${error.message} Progress was not advanced on screen.`; }
  finally { busy = false; }
}
slip.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(event.target); act({ type:'start', goal:data.get('goal'), minutes:Number(data.get('minutes')) }); });
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target) return;
  const type = target.dataset.action;
  if (['menu','pantry','receipts'].includes(type)) return showBook(type);
  act({type, recipe:target.dataset.recipe});
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
window.addEventListener('storage', event => { if (event.key === REAL_KEY && !demo) { try {state=read(localStorage,REAL_KEY);render();checkTime();} catch(error){notice.textContent=error.message;} } });
document.addEventListener('visibilitychange', checkTime);
try { state=read(localStorage,REAL_KEY); render();checkTime(); } catch(error) { notice.textContent=error.message; }
setInterval(checkTime, 1000);
