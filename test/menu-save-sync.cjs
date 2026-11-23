const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const {fresh,transition,RECIPES}=await import('../src/game.js');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await ctx.addInitScript(()=>{window.arrivals=0;window.frames=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>{window.frames++;return raf(fn)};addEventListener('cafe-ingredient-saved',()=>window.arrivals++);});
 const page=await ctx.newPage();await page.goto('http://localhost:4173');
 // Restore an actual pre-existing v1 save at review, including a learned cocoa recipe.
 let review=transition(fresh(),{type:'start',goal:'Preserved goal',minutes:25},{now:1,id:'saved-session'});review=transition(review,{type:'tick'},{now:1500001});review.pantry.cocoa=2;review.recipes=['cocoa'];
 await page.evaluate(s=>localStorage.setItem('cafe-after-class.progress.v1',JSON.stringify(s)),review);await page.reload();
 const second=await ctx.newPage();await second.goto('http://localhost:4173');await second.getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByRole('button',{name:'Collect receipt · goal complete'}).click();await page.locator('.ingredient-receipt').waitFor();
 assert.equal(await page.evaluate(()=>window.arrivals),1);assert.equal(await page.evaluate(()=>window.frames),0);
 await second.waitForFunction(()=>document.body.dataset.phase==='counter');assert.equal(await second.evaluate(()=>window.arrivals),0);assert.equal(await second.evaluate(()=>window.frames),0);
 assert.match(await second.locator('.menu-recipe[data-recipe="cocoa"]').innerText(),/Unlocked/);assert.equal(await second.locator('.menu-recipe[data-recipe="cocoa"] button').isEnabled(),true);
 // Make each distinct drink from the same existing-save shape using keyboard activation.
 for(const r of RECIPES){const s={...review,phase:'counter',served:r.unlockOrders || 0,order:r.id,reward:null,pantry:{milk:3,ice:3,coffee:1,matcha:1,cocoa:2}};await page.evaluate(s=>localStorage.setItem('cafe-after-class.progress.v1',JSON.stringify(s)),s);await page.reload();await page.getByRole('button',{name:'Choose from the menu'}).click();const make=page.locator(`.menu-recipe[data-recipe="${r.id}"] button`);await make.focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Serve drink',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')).drink),r.id);assert.equal(await page.locator('[data-action="serve"]').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');await page.getByRole('button',{name:'See recipe in menu'}).waitFor();if(r.id==='cocoa')assert.equal(await page.locator('.recipe-card').count(),0);}
 console.log('existing v1 save, learned cocoa, live menu sync, one-tab arrival, reduced-motion zero frames, all four keyboard-made drinks passed');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
