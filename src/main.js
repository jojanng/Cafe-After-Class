import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import './style.css';

const canvas = document.querySelector('#cafe');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
catch { document.querySelector('#fallback').hidden = false; throw new Error('WebGL is unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor('#e9dfcf');
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#e9dfcf', 18, 36);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
const wood = mat('#b58045');
const edge = mat('#d0a064');
const dark = mat('#383a32');
const cream = mat('#e2d5bd');
const ceramic = mat('#eee6d6');
const mesh = (geo, material, x, y, z) => {
  const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
};
const box = (w,h,d,m,x,y,z,r=.04) => mesh(new RoundedBoxGeometry(w,h,d,2,r),m,x,y,z);
const cyl = (rt,rb,h,m,x,y,z,n=32) => mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
const ring = (r,t,m,x,y,z) => { const o=mesh(new THREE.TorusGeometry(r,t,8,40),m,x,y,z);o.rotation.x=Math.PI/2;return o; };
// Subtle original procedural plaster: no downloaded textures or assets.
const plasterCanvas=document.createElement('canvas'); plasterCanvas.width=plasterCanvas.height=128;
const ctx=plasterCanvas.getContext('2d');ctx.fillStyle='#d9cebc';ctx.fillRect(0,0,128,128);
let seed=17;for(let i=0;i<5000;i++){seed=(seed*16807)%2147483647;const x=seed%128;seed=(seed*16807)%2147483647;ctx.fillStyle=i%2?'#d5c9b7':'#ded3c3';ctx.fillRect(x,seed%128,1,1);}
const plasterTexture=new THREE.CanvasTexture(plasterCanvas);plasterTexture.wrapS=plasterTexture.wrapT=THREE.RepeatWrapping;plasterTexture.repeat.set(5,3);plasterTexture.colorSpace=THREE.SRGBColorSpace;
const plaster=mat('#ffffff',{map:plasterTexture});
// A cropped room, not a floating dollhouse overview.
box(14,.15,12,mat('#d0bd9f'),0,-.12,0);
for(let z=-4;z<6;z+=.65)box(13,.008,.014,mat('#bba88f'),0,-.038,z,.002).castShadow=false;
box(20,14,.18,plaster,0,6.4,-3.2);
box(12,.15,.12,wood,0,.12,-3.05);
// Storefront window: softly abstracted street light behind dark slender framing.
box(.12,14,12,plaster,-4.4,6.4,-.15);
box(.05,3.8,4.2,mat('#dce4d4',{emissive:'#cbd9b9',emissiveIntensity:.22}),-4.31,2.65,-.25);
for(const z of [-2.35,-.25,1.85]) box(.12,3.9,.075,dark,-4.2,2.65,z,.01);
for(const y of [.72,4.57])box(.13,.08,4.3,dark,-4.2,y,-.25,.01);
box(.65,.12,4.5,edge,-4.04,1.18,-.25);
for(const z of [-1.25,.75]){
 cyl(.34,.34,.13,wood,-3.55,.79,z);
 for(const dx of [-.2,.2])for(const dz of [-.2,.2])box(.055,.73,.055,dark,-3.55+dx,.37,z+dz,.01);
 ring(.25,.018,dark,-3.55,.28,z);
}
// Broad rounded honey counter, with fine vertical joinery.
box(5.65,1.8,2.1,wood,.2,.88,.65,.3).receiveShadow=false;
box(5.85,.19,2.28,edge,.2,1.85,.65,.28);
box(5.3,.09,1.9,mat('#805b38'),.2,.09,.65,.15);
for(let x=-2.1;x<2.35;x+=.14)box(.012,1.38,.012,mat('#a27340'),x,.92,1.72,.004).castShadow=false;
// Back work shelf, a quiet espresso machine and stacked cups.
box(5.4,.12,.7,edge,.55,1.38,-2.5);
box(1.2,.7,.55,mat('#647062'),.9,1.78,-2.45,.09);
box(1.08,.12,.62,dark,.9,1.47,-2.4);
box(.98,.13,.04,dark,.9,1.9,-2.15);
for(const x of [.65,1.12]){box(.05,.18,.1,dark,x,1.67,-2.08);cyl(.11,.08,.14,ceramic,x,1.51,-2.12);}
for(const x of [1.85,2.14])for(let i=0;i<3;i++)cyl(.105,.08,.1,ceramic,x,1.49+i*.095,-2.5);
box(2.05,.10,.43,wood,-.7,3.0,-2.92);
for(let i=0;i<3;i++){cyl(.13,.12,.28,mat(['#b58151','#dbcfb5','#8c9579'][i]),-.05-i*.4,3.19,-2.89);}
// Black-framed pastry display, kept behind the drink rather than dominating it.
box(1.65,.08,.77,dark,-1.6,1.99,.25);
const glass= new THREE.MeshPhysicalMaterial({color:'#e6ece2',transparent:true,opacity:.15,roughness:.12,depthWrite:false});
box(1.62,.68,.015,glass,-1.6,2.35,.63,.002);
box(1.62,.018,.76,glass,-1.6,2.69,.25,.002);
for(const x of [-2.4,-.8])for(const z of [-.12,.63])box(.035,.73,.035,dark,x,2.35,z,.006);
for(const y of [2.02,2.7])for(const z of [-.12,.63])box(1.66,.035,.035,dark,-1.6,y,z,.006);
box(1.58,.025,.67,ceramic,-1.6,2.14,.25);
for(const x of [-2.08,-1.6,-1.12]){const bun=mesh(new THREE.SphereGeometry(.19,12,8),mat('#c78c48'),x,2.26,.27);bun.scale.set(1,.65,.8);for(let i=-1;i<=1;i++)box(.018,.012,.18,mat('#e2b571'),x+i*.055,2.38,.27,.006);}
// Two sculpted ribbed pendants; ribs follow the shade profile.
for(const [x,y,z] of [[-1.7,4.2,.1],[1.1,4.35,-.45]]){
 cyl(.014,.014,2,dark,x,y+1.2,z,12);
 const points=[];for(let j=0;j<=16;j++){const t=j/16;points.push(new THREE.Vector2(.2+.42*Math.sin(t*Math.PI*.78),.52-t*.62));}
 const shade=mesh(new THREE.LatheGeometry(points,48),mat('#e5be81',{side:THREE.DoubleSide}),x,y,z);
 for(let i=0;i<40;i++){const a=i/40*Math.PI*2;const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(Math.cos(a)*(p.x+.007),p.y,Math.sin(a)*(p.x+.007))));mesh(new THREE.TubeGeometry(path,16,.009,4,false),mat('#b88b53'),x,y,z);}
 cyl(.47,.47,.025,mat('#ffe1a1',{emissive:'#ffc56a',emissiveIntensity:.6}),x,y-.095,z);
 const light=new THREE.PointLight('#ffcc88',10,5,2);light.position.set(x,y-.25,z);scene.add(light);
}
// Hero tray and iced latte, intentionally tactile and slightly oversized.
box(1.45,.075,.94,mat('#755b42'),.83,1.995,1.05,.16);
box(1.32,.025,.81,mat('#b79a70'),.83,2.04,1.05,.12);
const drinkStart=scene.children.length;
cyl(.255,.205,.65,mat('#d7e6dd',{transparent:true,opacity:.3,roughness:.1,side:THREE.DoubleSide,depthWrite:false}),.72,2.41,1.06);
const drinkBody=cyl(.222,.19,.43,mat('#b98555'),.72,2.32,1.06);
const drinkTop=cyl(.223,.223,.09,mat('#805036'),.72,2.58,1.06);
ring(.25,.013,mat('#eff8ed',{transparent:true,opacity:.8}),.72,2.735,1.06);
for(const [dx,dz,a] of [[-.09,-.06,.2],[.08,-.04,.7],[.01,.12,.4]]){const ice=box(.16,.13,.16,mat('#d3dfce',{transparent:true,opacity:.72,roughness:.22}),.72+dx,2.66,1.06+dz,.025);ice.rotation.y=a;}
const straw=cyl(.018,.018,.72,mat('#e8ddbf'),.83,2.89,1.04,12);straw.rotation.z=-.14;
const drinkMeshes=scene.children.slice(drinkStart);
drinkMeshes.forEach(m=>m.visible=false);
const drinkOrigins=drinkMeshes.map(m=>m.position.clone());
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let serveFrame=0, servedPose=false;
function poseDrink(progress) {
  drinkMeshes.forEach((m,i)=>m.position.copy(drinkOrigins[i]).addScaledVector(new THREE.Vector3(-.65,-.1,.32),progress));
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
const ingredientPacket=new THREE.Group();scene.add(ingredientPacket);
const packetBody=new THREE.Mesh(new RoundedBoxGeometry(.43,.5,.2,2,.025),mat('#d9be8d'));
packetBody.position.y=.25;packetBody.castShadow=true;ingredientPacket.add(packetBody);
const packetCanvas=document.createElement('canvas');packetCanvas.width=256;packetCanvas.height=256;
const packetTexture=new THREE.CanvasTexture(packetCanvas);packetTexture.colorSpace=THREE.SRGBColorSpace;
const packetLabel=new THREE.Mesh(new THREE.PlaneGeometry(.36,.36),mat('#ffffff',{map:packetTexture}));
packetLabel.position.set(0,.27,.105);ingredientPacket.add(packetLabel);
let arrivalFrame=0;
function stopArrival(){cancelAnimationFrame(arrivalFrame);arrivalFrame=0;ingredientPacket.position.set(.77,2.055,1.05);}
function labelPacket(ingredient){
  const p=packetCanvas.getContext('2d');p.fillStyle='#f8efda';p.fillRect(0,0,256,256);
  p.fillStyle='#62533f';p.textAlign='center';p.font='24px monospace';p.fillText('PANTRY',128,60);
  p.font='34px Georgia';p.fillText(ingredient,128,133);p.font='24px monospace';p.fillText('+ 1',128,198);packetTexture.needsUpdate=true;
}
window.addEventListener('cafe-ingredient-saved',()=>{
  stopArrival();if(reducedMotion.matches || !ingredientPacket.visible)return;
  const start=performance.now();
  function frame(now){const t=Math.min(1,(now-start)/420);const remaining=Math.pow(1-t,3);
    ingredientPacket.position.set(.77-.18*remaining,2.055+.22*remaining,1.05);
    renderer.render(scene,camera);if(t<1)arrivalFrame=requestAnimationFrame(frame);else arrivalFrame=0;
  }
  frame(start);
});
reducedMotion.addEventListener('change',()=>{
  stopServeMotion();stopArrival();renderer.render(scene,camera);
  if(reducedMotion.matches) document.getAnimations().forEach(a=>a.finish());
});
const slipElement=document.createElement('div');
slipElement.className='order-slip';
slipElement.setAttribute('aria-hidden','true');
slipElement.innerHTML='<span>ONE THING</span><strong>at a time.</strong>';
document.querySelector('main').append(slipElement);
const slipAnchor=new THREE.Vector3(1.95,1.98,1.15);
window.addEventListener('cafe-state', ({detail})=>{
  servedPose=detail.phase==='served'; stopServeMotion();stopArrival();
  ingredientPacket.visible=detail.phase==='counter' && !!detail.reward;
  if(ingredientPacket.visible)labelPacket(detail.reward);
  const ready=['serve','served'].includes(detail.phase);
  drinkMeshes.forEach(m=>m.visible=ready);
  drinkBody.material.color.set({coffee:'#b98555',matcha:'#8a9b61',cocoa:'#74503c'}[detail.drink] || '#b98555');
  drinkTop.material.color.set({coffee:'#805036',matcha:'#687b3e',cocoa:'#553d2d'}[detail.drink] || '#805036');
  slipElement.innerHTML=detail.phase==='counter' && detail.reward?`<span>FRESHLY EARNED</span><strong>${detail.reward}</strong>`:ready?'<span>FOR YOUR GUEST</span><strong>made with care.</strong>':'<span>ONE THING</span><strong>at a time.</strong>';
  renderer.render(scene,camera);
});
scene.add(new THREE.HemisphereLight('#fff3da','#88745c',2.1));
const sun=new THREE.DirectionalLight('#fff0d2',3.2);sun.position.set(-5,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.normalBias=.06;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
function resize(){stopServeMotion();stopArrival();const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const mobile=w<600;camera.fov=mobile?43:36;camera.position.set(mobile?7.8:8.2,mobile?6.2:6.3,mobile?11.8:11.8);camera.lookAt(mobile?.05:0, mobile?2.15:2.0,.25);if(mobile){camera.position.set(8.8,6.9,13.5);camera.setViewOffset(w,h,0,-h*.07,w,h);}else camera.clearViewOffset();camera.updateProjectionMatrix();renderer.render(scene,camera);const projected=slipAnchor.clone().project(camera);slipElement.style.left=`${(projected.x*.5+.5)*w}px`;slipElement.style.top=`${(-projected.y*.5+.5)*h}px`;}
window.addEventListener('resize',resize);resize();
