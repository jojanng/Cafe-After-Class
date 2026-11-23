const {chromium}=require('playwright');
const THREE=require('three');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const artifacts=process.env.CAFE_ARTIFACTS || 'artifacts';
const url=process.env.CAFE_URL || 'http://localhost:4173';
const realKey='cafe-after-class.progress.v1', demoKey='cafe-after-class.demo.v1';
fs.mkdirSync(artifacts,{recursive:true});
const retired=/(look around|return to study view|rotate piece|decorate|backstore|shop|exterior|café coins)/i;
const paper=page=>page.locator('.order-slip');
async function pickupIsClear(page) {
  const {frameFixedCamera,GUEST_GLASS,PASTRY_CASE,WORKTOP_Y}=await import('../src/fixed-room.js');
  const canvas=await page.locator('#cafe').boundingBox();
  const receipt=await paper(page).boundingBox();
  const controls=await page.locator('#play-slip').boundingBox();
  const camera=new THREE.PerspectiveCamera(36,1,.1,60);
  frameFixedCamera(camera,canvas.width,canvas.height);
  camera.updateMatrixWorld();
  const cameraRight=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
  const lip=new THREE.Vector3(...GUEST_GLASS).addScaledVector(cameraRight,.255);
  lip.y+=.68;
  const glassRight=canvas.x+(lip.project(camera).x+1)*canvas.width/2;
  assert.ok(receipt.x>glassRight,'the projected paper clears the served glass');
  const nearestCaseFoot=new THREE.Vector3(PASTRY_CASE.x-PASTRY_CASE.width/2-.02,WORKTOP_Y,PASTRY_CASE.z+PASTRY_CASE.depth/2+.02);
  const caseLeft=canvas.x+(nearestCaseFoot.project(camera).x+1)*canvas.width/2;
  assert.ok(receipt.x+receipt.width<caseLeft,'the paper clears the pastry case');
  assert.ok(receipt.x+receipt.width<controls.x || receipt.y+receipt.height<controls.y,
    'the interactive slip leaves the pickup visible');
}
async function noNavigation(page) {
  assert.equal(await page.getByRole('button',{name:retired}).count(),0);
  assert.equal(await page.locator('#camera-tools, #room-paper, #backstore, [data-camera]').count(),0);
  assert.equal(await page.locator('#cafe').getAttribute('tabindex'),null);
  const before=await paper(page).getAttribute('style');
  await page.locator('#cafe').evaluate(canvas=>{
    for(const pointerType of ['mouse','touch']) {
      for(const [event,x,y] of [['pointerdown',150,220],['pointermove',200,275],['pointerup',200,275]]) {
        canvas.dispatchEvent(new PointerEvent(event,{pointerId:1,pointerType,button:0,clientX:x,clientY:y,bubbles:true}));
      }
    }
    canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:150,bubbles:true,cancelable:true}));
    canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'r',bubbles:true}));
  });
  assert.equal(await paper(page).getAttribute('style'),before);
}
async function makeOrder(page,i,mode) {
  const goal='Work through practice set '+i;
  await page.locator('#goal').fill(goal);
  await page.getByRole('button',{name:'Start demo focus'}).click();
  await page.getByRole('button',{name:'Collect receipt · goal complete'}).waitFor({timeout:16_000});
  await page.getByRole('button',{name:'Collect receipt · goal complete'}).click();
  await page.locator('.ingredient-receipt').waitFor();
  await page.locator('#play-slip [data-action="make"]:enabled').click();
  await page.getByRole('button',{name:'Serve drink',exact:true}).click();
  await page.getByRole('button',{name:'See recipe in menu'}).waitFor();
  assert.match(await paper(page).innerText(),/FOR YOUR GUEST/);
  assert.equal(await paper(page).isVisible(),true);
  const demo=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),demoKey);
  assert.equal(demo.served,i);
  assert.equal(demo.demoReceipts.length,i);
  assert.equal(demo.demoReceipts.at(-1).goal,goal);
  assert.equal('economy' in demo,false);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${artifacts}/fixed-${mode}-served-${i}.png`,fullPage:true,animations:'disabled'});
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try {
    for(const mode of ['desktop','mobile']){
      const mobile=mode==='mobile';
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,reducedMotion:'reduce'});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url);
      await page.locator('#goal').waitFor();
      await noNavigation(page);
      const originalPaper=await paper(page).getAttribute('style');
      await page.locator('#goal').fill('Real study to carry');
      await page.getByRole('button',{name:'Begin focus'}).click();
      await page.locator('#timer').waitFor();
      const real=await page.evaluate(key=>localStorage.getItem(key),realKey);
      await page.reload();
      await page.locator('#timer').waitFor();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),realKey),real);
      await page.getByRole('button',{name:/Carry goal forward/}).click();
      await page.locator('#goal').waitFor();
      assert.equal(await page.locator('#goal').inputValue(),'Real study to carry');
      const carried=await page.evaluate(key=>localStorage.getItem(key),realKey);
      const legacy={...JSON.parse(carried),recipes:['shaken-latte'],environment:{items:{counter:{x:4,z:-2,rotation:180}}},environmentUndo:{obsolete:true},economy:{owned:['recipe-shaken']}};
      const old=JSON.stringify(legacy);
      await page.evaluate(({key,old})=>localStorage.setItem(key,old),{key:realKey,old});
      await page.reload();
      await page.locator('#goal').waitFor();
      assert.equal(await paper(page).getAttribute('style'),originalPaper);
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),realKey),old);
      await page.getByRole('button',{name:'Menu',exact:true}).click();
      await page.getByRole('heading',{name:'Iced shaken latte'}).waitFor();
      await page.getByRole('button',{name:'Close book'}).click();
      await page.locator('#demo-toggle').click();
      await makeOrder(page,1,mode);
      await page.getByRole('button',{name:'Write the next goal'}).click();
      await makeOrder(page,2,mode);
      await noNavigation(page);
      await pickupIsClear(page);
      if (!mobile) {
        await page.setViewportSize({width:768,height:1024});
        await page.waitForFunction(()=>{
          const canvas=document.querySelector('#cafe');
          return canvas.width===Math.floor(canvas.clientWidth*Math.min(devicePixelRatio,2));
        });
        await pickupIsClear(page);
        await page.setViewportSize({width:1440,height:1000});
      }
      await page.reload();
      await page.locator('#goal').waitFor();
      assert.equal(await page.evaluate(key=>localStorage.getItem(key),realKey),old);
      assert.equal(await page.locator('#goal').inputValue(),'Real study to carry');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      console.log(mode,'two complete demo orders + fixed camera gestures + legacy save + reload');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
