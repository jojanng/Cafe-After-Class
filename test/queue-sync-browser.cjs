const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const url=process.env.CAFE_URL||'http://localhost:4173';
 if(process.env.CAFE_HTML){await ctx.setOffline(true);await ctx.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.CAFE_HTML)}));}
 const p=await ctx.newPage(),other=await ctx.newPage();await p.goto(url);await other.goto(url);
 await p.locator('#goal').fill('First tab draft');await other.locator('#goal').fill('Second tab draft');await other.locator('input[value="45"]').check();
 // Hold the shared write lock until both tabs have queued actions from revision zero.
 await p.evaluate(()=>new Promise(resolve=>{navigator.locks.request('cafe-progress',()=>new Promise(release=>{window.releaseQueueLock=release;resolve()}));}));
 await p.evaluate(()=>document.querySelector('[value="queue"]').click());
 await p.waitForFunction(async()=> (await navigator.locks.query()).pending.filter(lock=>lock.name==='cafe-progress').length===1);
 await other.evaluate(()=>document.querySelector('[value="queue"]').click());
 await other.waitForFunction(async()=> (await navigator.locks.query()).pending.filter(lock=>lock.name==='cafe-progress').length===2);
 await p.evaluate(()=>window.releaseQueueLock());
 await other.waitForFunction(()=>document.querySelector('#notice').textContent.includes('queue changed'));
 assert.equal(await other.locator('#goal').inputValue(),'Second tab draft');assert.equal(await other.locator('input[value="45"]').isChecked(),true);
 let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')));assert.equal(s.queue.length,1);
 const draft=p.locator('#goal');
 await draft.fill('Keep this unsaved draft');
 await draft.evaluate(e=>e.setSelectionRange(5,9));
 await other.getByRole('button',{name:'Save to study queue'}).click();
 await p.waitForFunction(()=>document.querySelector('.queue-heading').textContent.includes('2 / 3'));
 assert.equal(await draft.inputValue(),'Keep this unsaved draft');
 assert.deepEqual(await draft.evaluate(e=>[e===document.activeElement,e.selectionStart,e.selectionEnd]),[true,5,9]);
 await p.reload();s=await p.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')));assert.deepEqual(s.queue.map(q=>q.goal),['First tab draft','Second tab draft']);assert.equal(s.queue[1].minutes,45);
 await p.getByRole('button',{name:'Start next session',exact:true}).click();await p.locator('#timer').waitFor();await p.getByRole('button',{name:'Carry goal forward · no reward'}).click();await p.locator('#goal').waitFor();await p.getByRole('button',{name:'Start next session',exact:true}).click();await p.locator('#timer').waitFor();await p.reload();s=await p.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')));assert.equal(s.carry,'First tab draft');assert.equal(s.session.goal,'Second tab draft');assert.equal(s.session.duration,2700000);assert.equal(s.queue.length,0);assert.equal(s.receipts.length,1);assert.equal(s.receipts[0].status,'carried');assert.equal(s.pantry.coffee+s.pantry.matcha+s.pantry.cocoa,0);
 console.log('Forced concurrent queue writes reject stale save without losing draft; incoming sync preserves text; retry, 45-minute next, reload and retained unfinished goal passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
