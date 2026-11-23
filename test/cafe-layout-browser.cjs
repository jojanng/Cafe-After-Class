const {chromium} = require('playwright');
const assert = require('node:assert/strict');

const url = process.env.CAFE_URL || 'http://localhost:4173';
const saveKey = 'cafe-after-class.progress.v1';

// Clear the display buffer to a diagnostic color. Any exposed pixel reveals a hole in the room.
// Keep it readable after compositing only in this test context.
function markBackground() {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, options) {
    if (type==='webgl2') options={...options,preserveDrawingBuffer:true};
    return getContext.call(this,type,options);
  };
  const clear = WebGL2RenderingContext.prototype.clear;
  WebGL2RenderingContext.prototype.clear = function(bits) {
    if (this.canvas.id!=='cafe' || !(bits & this.COLOR_BUFFER_BIT) || this.getParameter(this.DRAW_FRAMEBUFFER_BINDING)) {
      return clear.call(this,bits);
    }
    const previous=this.getParameter(this.COLOR_CLEAR_VALUE);
    this.clearColor(1,0,1,1);
    clear.call(this,bits);
    this.clearColor(...previous);
    this.canvas.dataset.backgroundMarked='true';
  };
}

function checkRenderedPixels(canvas) {
  const gl=canvas.getContext('webgl2');
  const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let exposed=0, indigo=0, firstExposed;
  for(let i=0;i<pixels.length;i+=4) {
    const r=pixels[i], g=pixels[i+1], b=pixels[i+2];
    if (r>245 && g<12 && b>245) {
      firstExposed ??= [i/4%canvas.width,canvas.height-1-Math.floor(i/4/canvas.width)];
      exposed++;
    }
    if (b>40 && b>1.6*Math.max(r,g)) indigo++;
  }
  return {marked:canvas.dataset.backgroundMarked,exposed,firstExposed,indigo,error:gl.getError()};
}

async function restore(page, state) {
  await page.evaluate(({key,state})=>{
    localStorage.setItem(key,JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage',{key}));
    window.scrollTo(0,0);
  },{key:saveKey,state});
  await page.waitForFunction(phase=>document.body.dataset.phase===phase,state.phase);
}

async function checkSlip(page, state) {
  const layout=await page.evaluate(()=>{
    const slip=document.querySelector('#play-slip'), canvas=document.querySelector('#cafe');
    const primary=slip.querySelectorAll('.primary:enabled');
    const button=primary[0]?.getBoundingClientRect();
    const paper=document.querySelector('.order-slip');
    return {
      primary:primary.length,
      actionVisible:!button || (button.top>=0 && button.bottom<=innerHeight),
      belowScene:slip.getBoundingClientRect().top>=canvas.getBoundingClientRect().bottom,
      slipFits:slip.scrollHeight<=slip.clientHeight+1,
      pageFits:document.documentElement.scrollWidth<=innerWidth,
      paperVisible:!paper.hidden,
      queueShown:!!slip.querySelector('details'),
    };
  });
  assert.equal(layout.primary,state.phase==='focus'?0:1,`${state.phase} decision count`);
  assert.ok(layout.actionVisible && layout.belowScene && layout.slipFits && layout.pageFits,`clipped action in ${state.phase}`);
  assert.equal(layout.paperVisible,['counter','serve','served'].includes(state.phase));
  assert.equal(layout.queueShown,false);
}

(async()=>{
  const {fresh,transition}=await import('../src/game.js');
  const now=Date.now(), idle=fresh();
  const focus=transition(idle,{type:'start',minutes:25,goal:'Read a chapter'},{now,id:'layout-review'});
  const review=transition(focus,{type:'tick'},{now:focus.session.deadline});
  const reward=transition(review,{type:'complete'},{now:focus.session.deadline,random:0});
  const brewed=transition(reward,{type:'make',recipe:'coffee'});
  const served=transition(brewed,{type:'serve'});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  try {
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(markBackground);
    const page=await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    await page.goto(url);
    for(const [width,height] of [[1440,900],[2160,900],[768,1100],[390,844],[320,568]]) {
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>document.querySelector('#cafe').width===innerWidth);
      for(const state of [idle,focus,review,reward,brewed,served]) {
        await restore(page,state);
        await checkSlip(page,state);
      }
      const pixels=await page.locator('#cafe').evaluate(checkRenderedPixels);
      assert.equal(pixels.marked,'true');
      assert.equal(pixels.exposed,0,`room exterior visible at ${width}×${height}, starting at (${pixels.firstExposed})`);
      assert.ok(pixels.indigo>100,'indigo is visible in the scene');
      assert.equal(pixels.error,0,'WebGL error');
      console.log(`${width}×${height}: six phases, visible controls and ${pixels.exposed} exposed background pixels`);
    }

    // Small screens and large text can scroll the document; the queue and books remain operable.
    const goal='Reading notes '.repeat(12).trim().slice(0,160);
    const queued=transition(idle,{type:'queue-add',minutes:45,goal},{id:'queued-layout'});
    await restore(page,{...served,queue:queued.queue,queueRevision:queued.queueRevision});
    assert.equal(await page.locator('#play-slip .primary').getAttribute('data-action'),'start-next');
    await restore(page,{...served,queue:queued.queue,queueRevision:queued.queueRevision,order:'coffee',pantry:{...served.pantry,coffee:1}});
    assert.equal(await page.locator('#play-slip .primary').getAttribute('data-action'),'take-order');
    await restore(page,queued);
    await page.addStyleTag({content:':root {font-size:150%}'});
    await page.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('details').evaluate(e=>e.open));
    const remove=page.getByRole('button',{name:`Remove ${goal}`});
    await remove.scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>scrollY>0 && document.documentElement.scrollWidth<=innerWidth));
    assert.ok(await page.locator('#play-slip').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
    for(const name of ['Menu','Pantry','Receipts']) {
      const trigger=page.getByRole('button',{name,exact:true});
      await trigger.focus();
      await page.keyboard.press('Enter');
      assert.ok(await page.locator('dialog').isVisible());
      await page.keyboard.press('Escape');
      assert.ok(await trigger.evaluate(e=>document.activeElement===e));
    }
    await remove.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.querySelector('.study-queue'));
    assert.deepEqual(errors,[]);
    console.log('large text, page scrolling, queue disclosure and keyboard return from all three books passed');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
