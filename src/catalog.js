export const CATALOG=[
 {id:'reading-table',name:'Reading table',price:20,kind:'furniture',description:'A small honey-wood table for the interior. Place and rotate it in Decorate.'},
 {id:'patio-planter',name:'Patio planter',price:15,kind:'furniture',description:'A leafy ceramic planter for the exterior patio. Place it in Decorate.'},
 {id:'terracotta-tiles',name:'Terracotta tiles',price:10,kind:'surface',description:'A warm tiled finish for the interior floor or exterior patio.'},
 {id:'recipe-shaken',name:'Iced shaken latte recipe',price:20,kind:'recipe',recipeId:'shaken-latte',description:'Coffee, milk and ice with a pale foam layer. Added to Menu on purchase.'}
];
export const freshEconomy=(served=0)=>({version:1,balance:served*10,earned:served*10,demoCredit:0,owned:[],purchases:[]});
export function validateEconomy(e,demo=false){
 if(!e || e.version!==1 || ![e.balance,e.earned,e.demoCredit].every(n=>Number.isSafeInteger(n)&&n>=0) || (!demo&&e.demoCredit!==0) || !Array.isArray(e.owned)||!Array.isArray(e.purchases))throw Error('Saved café coins could not be read.');
 if(new Set(e.owned).size!==e.owned.length || e.owned.some(id=>!CATALOG.some(c=>c.id===id)) || new Set(e.purchases.map(p=>p.id)).size!==e.purchases.length || new Set(e.purchases.map(p=>p.catalogId)).size!==e.purchases.length)throw Error('Invalid saved purchases.');
 if(e.purchases.some(p=>!p.id||!Number.isFinite(p.at)||!CATALOG.some(c=>c.id===p.catalogId&&c.price===p.price)||!e.owned.includes(p.catalogId)) || e.owned.length!==e.purchases.length || e.balance!==e.earned+e.demoCredit-e.purchases.reduce((n,p)=>n+p.price,0))throw Error('Saved balance and purchases do not agree.');
}
export function shopTransition(state,action,{id,now,demo=false}={}){
 if(state.phase==='focus')throw Error('The shop is closed during focus.');
 const s=structuredClone(state);s.economy ||= freshEconomy(s.served);
 if(action.type==='demo-supplies'){
  if(!demo)throw Error('Practice supplies are only available in the isolated demo.');
  if(s.economy.demoCredit)return state;
  s.economy.demoCredit=60;s.economy.balance+=60;
  for(const k of ['coffee','matcha','cocoa'])s.pantry[k]=Math.max(s.pantry[k],2);
  s.pantry.milk=Math.max(s.pantry.milk,4);s.pantry.ice=Math.max(s.pantry.ice,4);return s;
 }
 const item=CATALOG.find(c=>c.id===action.catalogId);
 if(!item)throw Error('Choose an item in the catalogue.');
 if(s.economy.owned.includes(item.id))return state;
 if(s.economy.balance<item.price)throw Error('Not enough café coins. Serve an order to earn 10 coins.');
 if(!id || !Number.isFinite(now))throw Error('Purchase identity is missing.');
 if(s.economy.purchases.some(p=>p.id===id))return state;
 s.economy.balance-=item.price;s.economy.owned.push(item.id);s.economy.purchases.push({id,catalogId:item.id,price:item.price,at:now});
 if(item.recipeId&&!s.recipes.includes(item.recipeId))s.recipes.push(item.recipeId);
 return s;
}
