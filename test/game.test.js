import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, transition, INGREDIENTS, RECIPES, canMake } from '../src/game.js';
import { apply, read, REAL_KEY, DEMO_KEY } from '../src/storage.js';
const memory = () => {const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
const start=(s=fresh(),demo=false)=>transition(s,{type:'start',goal:'Read chapter 2',minutes:25},{now:1000,id:'session-1',demo});
const finish=(s,random=0,demo=false)=>transition(transition(s,{type:'tick'},{now:s.session.deadline}),{type:'complete'},{now:s.session.deadline,random,demo});
test('every eligible first drop enables a drink and serving unlocks exactly once',()=>{
 INGREDIENTS.forEach((ingredient,i)=>{let s=finish(start(),(i+.1)/3);assert.equal(s.reward,ingredient);assert.equal(s.receipts.length,1);assert(canMake(s,RECIPES[i]));const duplicate=transition(s,{type:'complete'},{now:9e9});assert.deepEqual(duplicate,s);s=transition(s,{type:'make',recipe:ingredient});assert.equal(s.pantry[ingredient],0);assert.deepEqual(transition(s,{type:'make',recipe:ingredient}),s);s=transition(s,{type:'serve'});assert.deepEqual(s.recipes,[ingredient]);assert.equal(s.served,1);assert.deepEqual(transition(s,{type:'serve'}),s);});
});
test('deadline survives refresh; early completion earns nothing; 45-minute option',()=>{const db=memory();let s=apply(db,REAL_KEY,{type:'start',goal:'Work',minutes:45},{now:2000,id:'x'});assert.equal(s.session.deadline,2702000);s=read(db,REAL_KEY);assert.equal(transition(s,{type:'complete'},{now:3000}),s);assert.equal(transition(s,{type:'tick'},{now:2701999}),s);s=apply(db,REAL_KEY,{type:'tick'},{now:2702000});assert.equal(s.phase,'review');apply(db,REAL_KEY,{type:'complete'},{now:2702000,random:.5});apply(db,REAL_KEY,{type:'complete'},{now:2702001,random:.9});assert.equal(read(db,REAL_KEY).receipts.length,1);assert.equal(read(db,REAL_KEY).pantry.matcha,1);});
test('carry unfinished goal early or after deadline without reward',()=>{for(const overdue of [false,true]){let s=start();if(overdue)s=transition(s,{type:'tick'},{now:s.session.deadline});s=transition(s,{type:'carry'},{now:2000000});assert.equal(s.carry,'Read chapter 2');assert.deepEqual(s.pantry,fresh().pantry);assert.equal(s.receipts[0].status,'carried');assert.equal(s.receipts[0].ingredient,null);assert.deepEqual(transition(s,{type:'carry'},{now:2e9}),s);}});
test('demo full loop never touches real receipts, pantry, recipes',()=>{const db=memory();apply(db,REAL_KEY,{type:'start',goal:'Real work',minutes:25},{now:1000,id:'real'});const before=db.getItem(REAL_KEY);let s=apply(db,DEMO_KEY,{type:'start',goal:'Practice'},{now:1000,id:'demo',demo:true});assert.equal(s.session.deadline,11000);apply(db,DEMO_KEY,{type:'tick'},{now:11000,demo:true});apply(db,DEMO_KEY,{type:'complete'},{now:11000,demo:true,random:.9});apply(db,DEMO_KEY,{type:'make',recipe:'cocoa'},{demo:true});s=apply(db,DEMO_KEY,{type:'serve'},{demo:true});assert.equal(s.receipts.length,0);assert.deepEqual(s.recipes,['cocoa']);assert.equal(db.getItem(REAL_KEY),before);});
test('persisted make/serve resist reload replay and unavailable recipes',()=>{const db=memory();db.setItem(REAL_KEY,JSON.stringify(finish(start())));assert.equal(apply(db,REAL_KEY,{type:'make',recipe:'matcha'}).phase,'counter');apply(db,REAL_KEY,{type:'make',recipe:'coffee'});apply(db,REAL_KEY,{type:'make',recipe:'coffee'});assert.equal(read(db,REAL_KEY).pantry.milk,2);apply(db,REAL_KEY,{type:'serve'});apply(db,REAL_KEY,{type:'serve'});assert.equal(read(db,REAL_KEY).served,1);});
test('failed storage write does not mutate prior progress; invalid saves stay intact',()=>{const before=start();const raw=JSON.stringify(before);const db={getItem:()=>raw,setItem:()=>{throw Error('full')}};assert.throws(()=>apply(db,REAL_KEY,{type:'carry'},{now:2000}),/full/);assert.deepEqual(read(db,REAL_KEY),before);assert.throws(()=>read({getItem:()=>'{bad'},REAL_KEY));});
test('saved serve effect occurs only after a successful write; repeat recipe has no unlock', async()=>{
 const {applyWithEffects}=await import('../src/storage.js');const db=memory();let s=finish(start());s=transition(s,{type:'make',recipe:'coffee'});db.setItem(REAL_KEY,JSON.stringify(s));
 const first=applyWithEffects(db,REAL_KEY,{type:'serve'});assert.equal(first.served,true);assert.equal(first.state.lastServeUnlocked,true);assert.equal(applyWithEffects(db,REAL_KEY,{type:'serve'}).served,false);
 s=transition(first.state,{type:'next'});s=finish(start(s));s=transition(s,{type:'make',recipe:'coffee'});db.setItem(REAL_KEY,JSON.stringify(s));const repeat=applyWithEffects(db,REAL_KEY,{type:'serve'});assert.equal(repeat.served,true);assert.equal(repeat.state.lastServeUnlocked,false);assert.deepEqual(repeat.state.recipes,['coffee','milk-cloud']);
 const broken={getItem:()=>JSON.stringify(s),setItem:()=>{throw Error('full')}};assert.throws(()=>applyWithEffects(broken,REAL_KEY,{type:'serve'}),/full/);
});
test('ingredient arrival effect follows a saved completion only',async()=>{
 const {applyWithEffects}=await import('../src/storage.js');const db=memory();const s=transition(start(),{type:'tick'},{now:1501000});db.setItem(REAL_KEY,JSON.stringify(s));
 const result=applyWithEffects(db,REAL_KEY,{type:'complete'},{now:1501000,random:.5});assert.equal(result.ingredientArrived,true);assert.equal(result.state.pantry.matcha,1);
 assert.equal(applyWithEffects(db,REAL_KEY,{type:'complete'},{now:1501000}).ingredientArrived,false);assert.equal(applyWithEffects(db,REAL_KEY,{type:'tick'},{now:1501000}).ingredientArrived,false);
 assert.throws(()=>applyWithEffects({getItem:()=>JSON.stringify(s),setItem:()=>{throw Error('full')}},REAL_KEY,{type:'complete'},{now:1501000}),/full/);
});
test('menu read model distinguishes learning, supplies, and turn availability',async()=>{
 const {recipeStatus}=await import('../src/game.js');const s=finish(start());assert.equal(recipeStatus(s,RECIPES[0]).available,true);assert.equal(recipeStatus(s,RECIPES[0]).unlocked,false);assert.deepEqual(recipeStatus(s,RECIPES[1]).missing,[{ingredient:'matcha',count:1}]);
 let next=transition(s,{type:'make',recipe:'coffee'});next=transition(next,{type:'serve'});assert.equal(recipeStatus(next,RECIPES[0]).unlocked,true);assert.equal(recipeStatus(next,RECIPES[0]).available,false);
});
test('existing v1 saves preserve cocoa, receipts, deadline and unlocks without migration',()=>{
 const db=memory();const s=start();s.pantry.cocoa=4;s.recipes=['cocoa'];s.receipts=[{goal:'Earlier goal',status:'completed',ingredient:'cocoa'}];const raw=JSON.stringify(s);db.setItem(REAL_KEY,raw);assert.deepEqual(read(db,REAL_KEY),s);assert.equal(db.getItem(REAL_KEY),raw);
});
test('all flavors stay playable after basic pantry depletion and produce distinct recipes',()=>{
 for(let i=0;i<3;i++){let s=start();s.pantry.milk=0;s.pantry.ice=0;s=finish(s,(i+.1)/3);assert(canMake(s,RECIPES[i]));s=transition(s,{type:'make',recipe:RECIPES[i].id});s=transition(s,{type:'serve'});assert.deepEqual(s.recipes,[RECIPES[i].id]);}
});
