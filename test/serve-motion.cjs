const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const {fresh,transition}=await import('../src/game.js');
 let ready=transition(fresh(),{type:'start',goal:'Motion review',minutes:25},{now:1,id:'review'});
 ready=transition(ready,{type:'tick'},{now:1500001});ready=transition(ready,{type:'complete'},{now:1500001,random:0});ready=transition(ready,{type:'make',recipe:'coffee'});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const output=process.env.CAFE_ARTIFACTS||'artifacts/serve-motion';fs.mkdirSync(output,{recursive:true});
 const url=process.env.CAFE_URL||'http://localhost:4173';
 for(const mobile of [false,true])for(const reduced of [false,true]){
  const name=`${mobile?'mobile':'desktop'}-${reduced?'reduced':'motion'}`;
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:reduced?'reduce':'no-preference'});
  if(process.env.CAFE_HTML){await ctx.setOffline(true);await ctx.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.CAFE_HTML)}));}
  await ctx.addInitScript(()=>{window.serveEvents=0;addEventListener('cafe-serve-saved',()=>window.serveEvents++);});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await page.evaluate(s=>localStorage.setItem('cafe-after-class.progress.v1',JSON.stringify(s)),ready);await page.reload();
  const other=await ctx.newPage();await other.goto(url);await page.bringToFront();
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.screenshot({path:path.join(output,`${name}-before.png`),fullPage:true});
  await page.evaluate(()=>{const b=document.querySelector('[data-action="serve"]');b.click();b.click();});
  await page.waitForFunction(()=>document.body.dataset.phase==='served');
  await page.clock.fastForward(240);await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=240}));
  await page.screenshot({path:path.join(output,`${name}-slide.png`),fullPage:true});
  assert.equal(await page.evaluate(()=>window.serveEvents),1);
  await page.clock.fastForward(540);await page.evaluate(()=>document.getAnimations().forEach(a=>a.finish()));
  await page.screenshot({path:path.join(output,`${name}-settled.png`),fullPage:true});
  assert.equal(await page.locator('.recipe-card').count(),1);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')).served),1);
  await other.waitForFunction(()=>document.body.dataset.phase==='served');assert.equal(await other.evaluate(()=>window.serveEvents),0);
  await page.reload();assert.equal(await page.evaluate(()=>window.serveEvents),0);assert.equal(await page.locator('.recipe-card').count(),1);
  await page.setViewportSize(mobile?{width:400,height:850}:{width:1400,height:960});assert.equal(await page.evaluate(()=>window.serveEvents),0);
  const repeat={...ready,recipes:['coffee','milk-cloud'],served:2};await page.evaluate(s=>localStorage.setItem('cafe-after-class.progress.v1',JSON.stringify(s)),repeat);await page.reload();await page.getByRole('button',{name:'Serve drink',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.phase==='served');assert.equal(await page.locator('.recipe-card').count(),0);assert.equal(await page.evaluate(()=>window.serveEvents),1);assert.deepEqual(errors,[]);
  console.log(name,'passed: rapid clicks, new/repeated recipe, sync, reload, resize');await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
