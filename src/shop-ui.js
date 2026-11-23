import {CATALOG} from './catalog.js';
export function createShopUI(){
 const button=document.createElement('button');button.id='shop-toggle';button.textContent='Shop';document.querySelector('nav').append(button);
 const book=document.createElement('dialog');book.id='shop-book';book.setAttribute('aria-labelledby','shop-title');document.body.append(book);
 let state,busy=false;const command=action=>new Promise(done=>window.dispatchEvent(new CustomEvent('cafe-command',{detail:{action,done}})));
 function render(){const e=state.economy;book.innerHTML=`<button id="close-shop">Close shop</button><h2 id="shop-title">The little shop</h2><p class="shop-balance">${e.balance} café coins</p><p>Earn 10 coins for every fulfilled order. Game earnings only, saved in this browser.</p>${state.demo?`<p>Isolated demo · real balance and belongings stay unchanged.</p><button id="demo-supplies" ${e.demoCredit?'disabled':''}>${e.demoCredit?'Practice supplies received':'Demo shop starter · 60 coins + pantry'}</button>`:''}<div>${CATALOG.map(item=>`<section class="shop-item"><h3>${item.name}</h3><p>${item.description}</p><p>${item.price} café coins</p><button data-buy="${item.id}" ${e.owned.includes(item.id)||e.balance<item.price?'disabled':''}>${e.owned.includes(item.id)?'Owned':`Buy ${item.name}`}</button></section>`).join('')}</div><p id="shop-status" role="status"></p>`;
 book.querySelector('#close-shop').onclick=()=>{if(!busy)book.close();};
 book.querySelector('#demo-supplies')?.addEventListener('click',()=>buy({type:'demo-supplies'}));
 book.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy({type:'purchase',catalogId:b.dataset.buy}));
 }
 async function buy(action){if(busy)return;busy=true;const result=await command(action);busy=false;book.querySelector('#shop-status').textContent=result?.error || (result?.changed?'Saved. Furnishings and tiles are in Backstore; recipes are in Menu.':'Already received. No coins spent.');book.querySelector('#close-shop').focus();}
 button.onclick=()=>{if(state?.phase==='focus')return;render();book.showModal();};
 book.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 window.addEventListener('cafe-state',({detail})=>{const changedMode=state&&state.demo!==detail.demo;state=detail;button.disabled=state.phase==='focus';if(book.open){if(changedMode||state.phase==='focus')book.close();else render();}});
}
