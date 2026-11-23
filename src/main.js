import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createServiceCorner} from './service-corner.js';
import {createIngredientReward} from './service-counter.js';
import {createOakBoards,paperPendant} from './corner-shell.js';
import {windowGlass} from './corner-materials.js';
import {GUEST_GLASS, GUEST_RECEIPT, frameFixedCamera} from './fixed-room.js';
import './style.css';

const canvas = document.querySelector('#cafe');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch { document.querySelector('#fallback').hidden = false; throw new Error('WebGL is unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor('#ddd5c9');
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .99;
const scene = new THREE.Scene();
// A small studio reflection gives nickel and glazed stoneware a readable curved edge.
const studio = new RoomEnvironment();
const reflections = new THREE.PMREMGenerator(renderer);
const metalReflections = reflections.fromScene(studio, 0, .1, 100, {size: 32}).texture;
studio.dispose();
reflections.dispose();
scene.fog = new THREE.Fog('#e9dfcf', 18, 36);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
const wood = mat('#b58045');
const edge = mat('#d0a064');
const dark = mat('#383a32');
const ceramic = mat('#eee6d6');
const mesh = (geo, material, x, y, z, parent=scene) => {
  const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (w,h,d,m,x,y,z,r=.04) => mesh(new RoundedBoxGeometry(w,h,d,2,r),m,x,y,z);
const cyl = (rt,rb,h,m,x,y,z,n=32) => mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
const ring = (r,t,m,x,y,z) => { const o=mesh(new THREE.TorusGeometry(r,t,8,40),m,x,y,z);o.rotation.x=Math.PI/2;return o; };
// Subtle original procedural plaster: no downloaded textures or assets.
const plasterCanvas=document.createElement('canvas'); plasterCanvas.width=plasterCanvas.height=128;
const ctx=plasterCanvas.getContext('2d');ctx.fillStyle='#fbf9f5';ctx.fillRect(0,0,128,128);
let seed=17;for(let i=0;i<5000;i++){seed=(seed*16807)%2147483647;const x=seed%128;seed=(seed*16807)%2147483647;ctx.fillStyle=i%2?'#f4f0eb':'#fffdfa';ctx.fillRect(x,seed%128,1,1);}
const plasterTexture=new THREE.CanvasTexture(plasterCanvas);plasterTexture.wrapS=plasterTexture.wrapT=THREE.RepeatWrapping;plasterTexture.repeat.set(5,3);plasterTexture.colorSpace=THREE.SRGBColorSpace;
const plaster=mat('#ffffff',{map:plasterTexture});
// A cropped room, not a floating dollhouse overview.
const baseMaterial=mat('#af9c88');
box(9.03,.30,7.43,baseMaterial,0,-.20,0,.055);
box(9,.025,7.4,mat('#d0bd9f'),0,0,0);
createOakBoards(scene);
box(9,5.6,.18,plaster,0,2.75,-3.2);
box(9,.10,.065,wood,0,.064,-3.078,.015);
// Narrow end caps finish the fixed interior.
box(9.02,.10,.24,plaster,0,5.53,-3.20,.025);
box(.22,.10,6.90,plaster,-4.40,5.53,0,.025);
// Storefront window: softly abstracted street light behind dark slender framing.
box(.12,5.6,6.9,plaster,-4.4,2.75,0);
// Recess the glazing inside the fixed left-wall frame.
const pane=mesh(new THREE.PlaneGeometry(4.2,3.8),windowGlass(),-4.245,2.65,-.25);
pane.rotation.y=Math.PI/2;
box(.105,.092,4.25,dark,-4.2,3.84,-.25,.016);
for(const z of [-2.35,-.25,1.85]) box(.14,3.9,.11,dark,-4.2,2.65,z,.01);
for(const y of [.72,4.57])box(.15,.11,4.3,dark,-4.2,y,-.25,.01);
box(.65,.12,4.5,edge,-4.04,1.18,-.25);
for(const z of [-1.25,.75]){
 cyl(.34,.34,.13,wood,-3.55,.79,z);
 for(const dx of [-.2,.2])for(const dz of [-.2,.2])box(.055,.73,.055,dark,-3.55+dx,.37,z+dz,.01);
 ring(.25,.018,dark,-3.55,.28,z);
}
const {prepSurface, contactShade} = createServiceCorner(scene, metalReflections);
paperPendant(scene,-1.84,4.47,.11);
paperPendant(scene,.83,4.62,-.48);
const prepPoint = prepSurface.getWorldPosition(new THREE.Vector3());
const serviceSlide = new THREE.Vector3(...GUEST_GLASS).sub(prepPoint);
const receiptAnchor = new THREE.Vector3(...GUEST_RECEIPT);
// Model the glass from its foot. Filling and sliding move the same glass.
const drink = new THREE.Group(); scene.add(drink); drink.visible = false;
const bodyHeight = .43, topHeight = .09, liquidBottom = .052;
mesh(new THREE.CylinderGeometry(.255,.205,.68,32),mat('#d7e6dd',{transparent:true,opacity:.3,roughness:.1,side:THREE.DoubleSide,depthWrite:false}),0,.34,0,drink);
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
  drink.position.copy(prepPoint).addScaledVector(serviceSlide,progress);
  // Lift just enough to clear the pan wall on the way to the customer.
  const travel = Math.min(1,progress);
  drink.position.y = THREE.MathUtils.lerp(prepPoint.y,GUEST_GLASS[1],travel) + .18*Math.sin(Math.PI*travel);
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
slipElement.innerHTML='<span>ONE THING</span><strong>at a time.</strong>';
document.querySelector('main').append(slipElement);
window.addEventListener('cafe-state', ({detail})=>{
  servedPose=detail.phase==='served';prepareReady=detail.phase==='serve'; stopServeMotion();stopArrival();stopPreparation();
  reward.group.visible=detail.phase==='counter' && !!detail.reward;
  if(reward.group.visible)labelPacket(detail.reward);
  const ready=['serve','served'].includes(detail.phase);
  drink.visible=ready;
  drinkBody.material.color.set({coffee:'#b98555',matcha:'#8a9b61',cocoa:'#74503c','milk-cloud':'#e8dcc3','shaken-latte':'#cbb18b'}[detail.drink] || '#b98555');
  drinkTop.material.color.set({coffee:'#805036',matcha:'#687b3e',cocoa:'#553d2d','milk-cloud':'#fff3df','shaken-latte':'#e5d5b9'}[detail.drink] || '#805036');
  slipElement.innerHTML=detail.phase==='counter' && detail.reward?`<span>FRESHLY EARNED</span><strong>${detail.reward}</strong>`:ready?'<span>FOR YOUR GUEST</span><strong>made with care.</strong>':'<span>ONE THING</span><strong>at a time.</strong>';
  draw();
});
scene.add(new THREE.HemisphereLight('#fff0d9','#bba294',1.45));
const sun=new THREE.DirectionalLight('#ffebd1',2.3);
sun.position.set(1.65,8,5.2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias=.028;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
// A fixed composition: pointer, wheel and keyboard never change the camera.
function draw(){
  renderer.render(scene,camera);
  const projected=receiptAnchor.clone().project(camera);
  slipElement.style.left=`${(projected.x*.5+.5)*canvas.clientWidth}px`;
  slipElement.style.top=`${(-projected.y*.5+.5)*canvas.clientHeight}px`;
}
function resize(){
  stopServeMotion();stopArrival();stopPreparation();
  const w=canvas.clientWidth,h=canvas.clientHeight;
  renderer.setSize(w,h,false);
  frameFixedCamera(camera,w,h);
  draw();
}
window.addEventListener('resize',resize);resize();
