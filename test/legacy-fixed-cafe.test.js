import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh, RECIPES, recipeEligible, transition} from '../src/game.js';
import {apply, read, REAL_KEY} from '../src/storage.js';

test('retired layout and coin data cannot erase or alter active core progress', () => {
  const now=100, session={id:'study-a',goal:'Keep studying FCFE',started:now,deadline:now+1500000,duration:1500000};
  const receipts=[{id:'study-old',goal:'Recall the cost of equity',ingredient:'matcha',status:'completed',ended:99}];
  const saved={...fresh(),phase:'focus',session,receipts,served:3,
    recipes:['coffee','shaken-latte'],pantry:{milk:3,ice:2,coffee:1,matcha:0,cocoa:1},carry:'Review the memo',
    queue:[{id:'study-b',goal:'Rehearse out loud',minutes:45}],queueRevision:3,
    economy:{owned:['recipe-shaken'],balance:40},environment:{items:{counter:{x:5,z:-5,rotation:180}},revision:12},environmentUndo:{obsolete:true},lastEarning:10};
  const raw=JSON.stringify(saved), storage=new Map([[REAL_KEY,raw]]);
  const adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  const loaded=read(adapter,REAL_KEY);
  assert.deepEqual(loaded.session,session);
  for (const key of ['receipts','pantry','queue','queueRevision','carry','served']) assert.deepEqual(loaded[key],saved[key]);
  assert.deepEqual(loaded.recipes,['coffee','shaken-latte','milk-cloud']);
  assert.equal(storage.get(REAL_KEY),raw);
  for (const key of ['environment','environmentUndo','economy','lastEarning']) assert.equal(key in loaded,false);
  const after=apply(adapter,REAL_KEY,{type:'tick'},{now:session.deadline});
  assert.equal(after.phase,'review');
  assert.deepEqual(JSON.parse(storage.get(REAL_KEY)),after);
});

test('grandfathered iced shaken latte is usable; no old shop or placement action can mutate a new save', () => {
  const recipe=RECIPES.find(r=>r.id==='shaken-latte');
  const raw={...fresh(),phase:'serve',drink:'shaken-latte',order:'shaken-latte',economy:{owned:['recipe-shaken']}};
  const legacy=read({getItem:()=>JSON.stringify(raw)},REAL_KEY);
  assert.equal(recipeEligible(legacy,recipe),true);
  const served=transition(legacy,{type:'serve'});
  assert.equal(served.phase,'served');
  assert.equal('economy' in served,false);
  assert.equal(recipeEligible(fresh(),recipe),false);
  const start=fresh();
  for(const type of ['layout-save','layout-undo','purchase','demo-supplies']) assert.equal(transition(start,{type}),start);
});
