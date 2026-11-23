import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createIngredientReward} from './service-counter.js';
import {createReviewLayout, frameReviewCamera, positionReviewDrink, reviewGlassScale} from './review-layout.js';
import './style.css';

const canvas = document.querySelector('#cafe');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch { document.querySelector('#fallback').hidden = false; throw new Error('WebGL is unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor('#E5E3DD');
const scene = new THREE.Scene();
// The review link selects a camera once. Both views use the same scene and game state.
const planView=new URLSearchParams(location.search).get('review')==='plan';
const camera=planView ? new THREE.OrthographicCamera(-5,5,4,-4,.1,60) : new THREE.PerspectiveCamera(36,1,.1,60);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
const ceramic = mat('#eee6d6');
const mesh = (geo, material, x, y, z, parent=scene) => {
  const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
};
const {prepSurface,guestGlass,receipt}=createReviewLayout(scene);
const contactShade=new THREE.MeshBasicMaterial({color:'#71695D',transparent:true,depthWrite:false});
const prepPoint = prepSurface.getWorldPosition(new THREE.Vector3());
// Model the glass from its foot. Filling and sliding move the same glass.
const drink = new THREE.Group(); scene.add(drink); drink.visible = false;
drink.scale.setScalar(reviewGlassScale);
const bodyHeight = .43, topHeight = .09, liquidBottom = .052;
const glassRadius=.255, glassHeight=.68;
mesh(new THREE.CylinderGeometry(glassRadius,.205,glassHeight,32),mat('#d7e6dd',{transparent:true,opacity:.3,roughness:.1,side:THREE.DoubleSide,depthWrite:false}),0,glassHeight/2,0,drink);
const drinkBody=mesh(new THREE.CylinderGeometry(.222,.19,bodyHeight,32),mat('#b98555'),0,0,0,drink);
const drinkTop=mesh(new THREE.CylinderGeometry(.223,.223,topHeight,32),mat('#805036'),0,0,0,drink);
const lip=mesh(new THREE.TorusGeometry(.25,.013,8,40),mat('#eff8ed',{transparent:true,opacity:.8}),0,.682,0,drink);
lip.rotation.x=Math.PI/2;
for(const [dx,dz,a] of [[-.09,-.06,.2],[.08,-.04,.7],[.01,.12,.4]]){
  const ice=mesh(new RoundedBoxGeometry(.16,.13,.16,2,.025),mat('#d3dfce',{transparent:true,opacity:.72,roughness:.22}),dx,.607,dz,drink);
  ice.rotation.y=a;
}
const straw=mesh(new THREE.CylinderGeometry(.018,.018,.72,12),mat('#e8ddbf'),.11,.837,-.02,drink);
straw.rotation.z=-.14;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let serveFrame=0, servedPose=false;
function poseDrink(progress) {
  positionReviewDrink(drink.position,prepPoint,guestGlass,progress);
}
function stopServeMotion() {
  cancelAnimationFrame(serveFrame); serveFrame=0;
  poseDrink(servedPose ? 1 : 0);
}
window.addEventListener('cafe-serve-saved', ()=>{
  stopServeMotion();
  if (reducedMotion.matches || !servedPose) return;
  const start=performance.now();
  poseDrink(0);
  function frame(now) {
    const t=Math.min(1,(now-start)/560);
    // Slow into a tiny overshoot, then settle without moving the camera or liquid.
    const progress=t<.82 ? 1.025*(1-Math.pow(1-t/.82,3)) : 1+.025*Math.pow((1-t)/.18,2);
    poseDrink(progress);renderer.render(scene,camera);
    if(t<1) serveFrame=requestAnimationFrame(frame); else serveFrame=0;
  }
  serveFrame=requestAnimationFrame(frame);
});
// One original paper ingredient packet; state rendering sets its final pose.
const packetCanvas=document.createElement('canvas');packetCanvas.width=256;packetCanvas.height=256;
const packetTexture=new THREE.CanvasTexture(packetCanvas);packetTexture.colorSpace=THREE.SRGBColorSpace;
const reward=createIngredientReward(prepSurface,packetTexture,contactShade);
let arrivalFrame=0;
function stopArrival(){cancelAnimationFrame(arrivalFrame);arrivalFrame=0;reward.place(0);}
function labelPacket(ingredient){
  const p=packetCanvas.getContext('2d');p.fillStyle='#f8efda';p.fillRect(0,0,256,256);
  p.fillStyle='#62533f';p.textAlign='center';p.font='24px monospace';p.fillText('PANTRY',128,60);
  p.font='34px Georgia';p.fillText(ingredient,128,133);p.font='24px monospace';p.fillText('+ 1',128,198);packetTexture.needsUpdate=true;
}
window.addEventListener('cafe-ingredient-saved',()=>{
  stopArrival();if(reducedMotion.matches || !reward.group.visible)return;
  const start=performance.now();
  function frame(now){const t=Math.min(1,(now-start)/420);const remaining=Math.pow(1-t,3);
    reward.place(remaining);
    renderer.render(scene,camera);if(t<1)arrivalFrame=requestAnimationFrame(frame);else arrivalFrame=0;
  }
  frame(start);
});
// Preparation is a stationary fill/layer gesture, separate from the serving slide.
const pour=new THREE.Group();prepSurface.add(pour);pour.visible=false;
const pitcher=new THREE.Mesh(new THREE.CylinderGeometry(.15,.12,.27,20),ceramic);
pitcher.position.set(.15,1.087,0);pitcher.rotation.z=.65;pour.add(pitcher);
const stream=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.44,12),mat('#d8c3a0'));
stream.position.set(0,.837,0);pour.add(stream);
let prepareFrame=0,prepareReady=false;
function fillGlass(fill) {
  drinkBody.scale.y=Math.max(.005,fill);
  drinkBody.position.y=liquidBottom+bodyHeight*drinkBody.scale.y/2;
  drinkTop.scale.y=Math.max(.005,(fill-.72)/.28);
  drinkTop.position.y=liquidBottom+bodyHeight*drinkBody.scale.y+topHeight*drinkTop.scale.y/2;
}
function stopPreparation(){cancelAnimationFrame(prepareFrame);prepareFrame=0;pour.visible=false;fillGlass(1);}
window.addEventListener('cafe-prepare-saved',()=>{
  stopPreparation();if(reducedMotion.matches || !prepareReady)return;
  const start=performance.now();pour.visible=true;stream.material.color.copy(drinkTop.material.color);
  function frame(now){const t=Math.min(1,(now-start)/700);const fill=1-Math.pow(1-t,2);
    fillGlass(fill);
    pour.visible=t<.85;renderer.render(scene,camera);
    if(t<1)prepareFrame=requestAnimationFrame(frame);else {stopPreparation();renderer.render(scene,camera);}
  }
  frame(start);
});
reducedMotion.addEventListener('change',()=>{
  stopServeMotion();stopArrival();stopPreparation();renderer.render(scene,camera);
  if(reducedMotion.matches) document.getAnimations().forEach(a=>a.finish());
});
const slipElement=document.createElement('div');
slipElement.className='order-slip';
slipElement.setAttribute('aria-hidden','true');
slipElement.hidden=true;
if(planView) slipElement.style.transform='translate(-50%,-50%)';
canvas.parentElement.append(slipElement);
window.addEventListener('cafe-state', ({detail})=>{
  servedPose=detail.phase==='served';prepareReady=detail.phase==='serve'; stopServeMotion();stopArrival();stopPreparation();
  reward.group.visible=detail.phase==='counter' && !!detail.reward;
  if(reward.group.visible)labelPacket(detail.reward);
  const ready=['serve','served'].includes(detail.phase);
  drink.visible=ready;
  drinkBody.material.color.set({coffee:'#b98555',matcha:'#8a9b61',cocoa:'#74503c','milk-cloud':'#e8dcc3','shaken-latte':'#cbb18b'}[detail.drink] || '#b98555');
  drinkTop.material.color.set({coffee:'#805036',matcha:'#687b3e',cocoa:'#553d2d','milk-cloud':'#fff3df','shaken-latte':'#e5d5b9'}[detail.drink] || '#805036');
  slipElement.hidden=!(reward.group.visible || ready);
  slipElement.innerHTML=reward.group.visible?`<span>FRESHLY EARNED</span><strong>${detail.reward}</strong>`:'<span>FOR YOUR GUEST</span><strong>Pickup</strong>';
  draw();
});
// A fixed composition: pointer, wheel and keyboard never change the camera.
function draw(){
  renderer.render(scene,camera);
  // Keep the original paper overlay attached to its own guest-side spot on the curved slab.
  const center=receipt.getWorldPosition(new THREE.Vector3()).project(camera);
  const edge=receipt.localToWorld(new THREE.Vector3(.335,0,0)).project(camera);
  const width=THREE.MathUtils.clamp(Math.abs(edge.x-center.x)*canvas.clientWidth,32,116);
  slipElement.style.setProperty('--paper-width',width+'px');
  slipElement.style.left=`${(center.x*.5+.5)*canvas.clientWidth}px`;
  slipElement.style.top=`${(-center.y*.5+.5)*canvas.clientHeight}px`;
}
let viewWidth=0, viewHeight=0;
function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if (!w || !h || (w===viewWidth && h===viewHeight)) return;
  viewWidth=w; viewHeight=h;
  stopServeMotion();stopArrival();stopPreparation();
  renderer.setSize(w,h,false);
  frameReviewCamera(camera,w,h);
  draw();
}
new ResizeObserver(resize).observe(canvas);
resize();
