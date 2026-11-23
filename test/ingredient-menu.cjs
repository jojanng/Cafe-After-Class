const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const output=process.env.CAFE_ARTIFACTS||'artifacts/batch-one';fs.mkdirSync(output,{recursive:true});
 const cases=process.env.INGREDIENT_ONLY?[['desktop',1440,1000,'no-preference']]:[['desktop',1440,1000,'no-preference'],['mobile',390,844,'no-preference'],['desktop-reduced',1440,1000,'reduce'],['mobile-reduced',390,844,'reduce']];
 for(const [name,width,height,reducedMotion] of cases){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion});await ctx.addInitScript(()=>{window.arrivals=0;addEventListener('cafe-ingredient-saved',()=>window.arrivals++);});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4173');const real=await page.evaluate(()=>localStorage.getItem('cafe-after-class.progress.v1'));
  await page.locator('#demo-toggle').click();await page.locator('#goal').fill('A quiet chapter');await page.getByRole('button',{name:'Start demo focus'}).click();await page.getByRole('button',{name:'Collect receipt · goal complete'}).waitFor({timeout:20000});
  await page.evaluate(()=>{const b=document.querySelector('[data-action="complete"]');b.click();b.click()});await page.locator('.ingredient-receipt').waitFor();
  assert.equal(await page.evaluate(()=>window.arrivals),1);let saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cafe-after-class.demo.v1')));assert.equal(saved.pantry[saved.reward],1);assert.equal(saved.receipts.length,0);
  await page.screenshot({path:`${output}/${name}-ingredient.png`,fullPage:true});
  if(!process.env.INGREDIENT_ONLY){await page.getByRole('button',{name:'Choose from the menu'}).click();assert.equal(await page.locator('.menu-recipe').count(),3);await page.screenshot({path:`${output}/${name}-menu.png`,fullPage:true});await page.locator('#notebook button[data-action="make"]:enabled').first().click();assert.equal(await page.locator('#notebook').evaluate(e=>e.open),false);}
  else await page.locator('button[data-action="make"]:enabled').first().click();
  await page.getByRole('button',{name:'Serve drink',exact:true}).click();await page.getByRole('button',{name:'See recipe in menu'}).click();await page.getByRole('button',{name:'Close book'}).click();await page.locator('#demo-toggle').click();assert.equal(await page.evaluate(()=>localStorage.getItem('cafe-after-class.progress.v1')),real);
  // An existing v1 completion snapshot restores without a second arrival or award.
  await page.evaluate(s=>localStorage.setItem('cafe-after-class.progress.v1',JSON.stringify(s)),saved);await page.reload();assert.equal(await page.evaluate(()=>window.arrivals),0);await page.setViewportSize({width:width+4,height});assert.equal(await page.evaluate(()=>window.arrivals),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')).pantry[JSON.parse(localStorage.getItem('cafe-after-class.progress.v1')).reward]),1);
  assert.deepEqual(errors,[]);console.log(name,'10-second loop, arrival once, pantry, reload, resize, demo isolation passed');await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
