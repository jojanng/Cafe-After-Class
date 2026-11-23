import * as THREE from 'three';
import {createPrepPan} from './service-counter.js';

// Positions digitized from the owner's drawing, normalized to a width of 1600.
// The top of the sheet is the back wall. Increasing sheet Y walks toward the guest.
const units = 160;
const xAt = u => (u-800)/units;
const zAt = v => (v-500)/units;
export const worktopHeight = 1.02;
export const reviewGlassScale = .55;

export function planPoint(u,v,y=0) {
  return new THREE.Vector3(xAt(u),y,zAt(v));
}

function counterFootprint() {
  const shape = new THREE.Shape();
  const move = (u,v) => shape.moveTo(xAt(u),-zAt(v));
  const line = (u,v) => shape.lineTo(xAt(u),-zAt(v));
  const curve = (a,b,c,d,e,f) => shape.bezierCurveTo(xAt(a),-zAt(b),xAt(c),-zAt(d),xAt(e),-zAt(f));
  move(83,642);
  line(574,623);
  curve(703,624,756,606,760,544);
  line(767,273);
  line(986,267);
  line(999,703);
  curve(1002,780,948,821,847,825);
  line(89,849);
  shape.closePath();
  return shape;
}

function millwork(shape,bottom,height,material,name) {
  const geometry = new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:18});
  geometry.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geometry,material);
  mesh.name=name;
  mesh.position.y=bottom;
  mesh.castShadow=mesh.receiveShadow=true;
  return mesh;
}

const matte = color => new THREE.MeshLambertMaterial({color});
function box(parent,material,w,h,d,x,y,z) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);
  mesh.castShadow=!material.transparent;
  mesh.receiveShadow=true;
  parent.add(mesh);
  return mesh;
}
function station(parent,name,u,v,y=0) {
  const group=new THREE.Group();
  group.name=name;
  group.position.copy(planPoint(u,v,y));
  parent.add(group);
  return group;
}

function enclosure(room) {
  const floor=matte('#D2CEC7'), wall=matte('#E0DDD6'), frame=matte('#848C8B');
  const walls=[wall,wall,matte('#A9A79F'),wall,wall,wall];
  const height=3.72, thick=.11;
  const left=xAt(48), right=xAt(1515), back=zAt(62);
  const floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(34,34),floor);
  floorMesh.rotation.x=-Math.PI/2;
  floorMesh.receiveShadow=true;
  room.add(floorMesh);
  // Only its underside renders. The room stays open to the overhead review camera.
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(34,34),new THREE.MeshBasicMaterial({color:'#D5D1C9'}));
  ceiling.rotation.x=Math.PI/2;
  ceiling.position.y=height;
  room.add(ceiling);
  function sideWall(x,z0,z1) {
    return box(room,walls,thick,height,z1-z0,x,height/2,(z0+z1)/2);
  }
  box(room,walls,right-left+thick,height,thick,(right+left)/2,height/2,back).name='Back wall';
  sideWall(left,back,zAt(898)).name='Left wall';
  const openingBack=zAt(238), openingFront=zAt(650);
  sideWall(right,back,openingBack);
  sideWall(right,openingFront,zAt(994));
  const window=station(room,'Right window',1515,444);
  const depth=openingFront-openingBack, sill=.79;
  box(window,walls,thick,sill,depth,0,sill/2,0);
  box(window,frame,.14,.055,depth,0,sill,0);
  box(window,frame,.085,.065,depth,0,height-.0325,0);
  for(const z of [-depth/2,0,depth/2]) box(window,frame,.075,height-sill,.038,0,(sill+height)/2,z);
  const glazing=new THREE.Mesh(new THREE.PlaneGeometry(depth,height-sill),
    new THREE.MeshBasicMaterial({color:'#E4EEEB',side:THREE.DoubleSide}));
  glazing.rotation.y=-Math.PI/2;
  glazing.position.set(.047,(sill+height)/2,0);
  window.add(glazing);
  return window;
}

function backWallFittings(room) {
  const neutral=matte('#A7A69E'), top=matte('#BCBCB4');
  const strip=station(room,'Separate rear strip',545,209);
  strip.rotation.y=.025;
  box(strip,neutral,5.31,.79,.46,0,.395,0);
  box(strip,top,5.37,.075,.54,0,.8275,0);
  const paper=matte('#F7F5ED'), rail=matte('#7C7B77'), indigo=matte('#2B2C7A');
  for(const u of [305,651]) {
    const banner=station(room,'Hanging banner',u,88);
    box(banner,rail,1.55,.042,.055,0,2.87,0);
    box(banner,paper,1.45,1.04,.030,0,2.33,0);
    box(banner,indigo,.13,1.04,.016,-.58,2.33,.022);
    box(banner,indigo,1.45,.068,.016,0,1.845,.022);
  }
}

function espressoMachine(room) {
  const machine=station(room,'Espresso machine',389,704,worktopHeight);
  machine.rotation.y=.035;
  const steel=matte('#969D9F'), cap=matte('#B6BCBC'), inset=matte('#5F676A'), drip=matte('#7E8789');
  const w=2.10;
  box(machine,inset,w,.065,1,0,.0325,0);
  // The broad back panel faces the guest. The two groups and drip tray open into the staff aisle (−Z).
  box(machine,steel,w-.065,.54,.36,0,.325,.29);
  box(machine,cap,w,.18,.82,0,.625,.045);
  for(const x of [-.94,.94]) box(machine,steel,.14,.50,.73,x,.312,.02);
  box(machine,inset,1.72,.33,.045,0,.335,.085);
  box(machine,drip,1.76,.055,.36,0,.105,-.29).name='Staff drip tray';
  for(const x of [-.44,.44]) {
    box(machine,cap,.23,.09,.18,x,.485,-.255);
    box(machine,inset,.065,.055,.25,x,.435,-.34);
  }
  for(const x of [-.63,-.52,-.41]) box(machine,inset,.042,.19,.014,x,.334,.477);
  return machine;
}

function terminal(room) {
  const pos=station(room,'Point of sale',695,682,worktopHeight);
  pos.rotation.y=.29;
  const base=matte('#797D7D'), shell=matte('#9A9F9E'), screen=matte('#4E5658');
  box(pos,base,.46,.045,.30,0,.0225,0);
  box(pos,base,.12,.22,.12,0,.15,0);
  const housing=box(pos,shell,.75,.38,.075,0,.384,0);
  housing.rotation.x=.27;
  box(housing,screen,.68,.31,.012,0,0,-.044);
}

function pastryCase(room) {
  const display=station(room,'Glass pastry case',878,434,worktopHeight);
  const w=1.04,d=1.60,h=.65;
  const frame=matte('#646C6D'), deck=matte('#C9CACE');
  const glass=new THREE.MeshBasicMaterial({color:'#BFCBCB',transparent:true,opacity:.12,depthWrite:false});
  box(display,frame,w,.06,d,0,.03,0);
  box(display,deck,w-.065,.02,d-.065,0,.07,0);
  box(display,glass,w-.025,h-.07,d-.025,0,(h+.07)/2,0);
  for(const side of [-1,1]) {
    box(display,frame,.026,.027,d,side*(w-.026)/2,h,0);
    box(display,frame,w,.027,.026,0,h,side*(d-.026)/2);
    for(const end of [-1,1]) box(display,frame,.026,h,.026,side*(w-.026)/2,h/2,end*(d-.026)/2);
  }
  box(display,deck,w-.085,.015,d-.10,0,.34,0);
  return display;
}

function moneyTree(room) {
  const tree=station(room,'Korean money tree',1187,340);
  const pot=matte('#B4ADA1'), trunk=matte('#8A8174'), leaf=matte('#8F9988');
  const vessel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.205,.43,12),pot);
  vessel.position.y=.215; vessel.castShadow=true; tree.add(vessel);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.048,.072,1.16,7),trunk);
  stem.position.y=.98; stem.castShadow=true; tree.add(stem);
  const leaflet=new THREE.SphereGeometry(1,5,3);
  for(const [x,y,z,angle] of [[-.38,1.43,.17,.15],[.37,1.58,.38,.75],[.20,1.72,-.49,.2],[-.23,1.91,-.26,.7],[.01,1.85,.27,.35]]) {
    const start=new THREE.Vector3(0,1.03,0), end=new THREE.Vector3(x,y,z);
    const axis=end.clone().sub(start);
    const branch=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,axis.length(),6),trunk);
    branch.position.copy(start).lerp(end,.5);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());tree.add(branch);
    for(let i=0;i<5;i++) {
      const theta=angle+i*Math.PI*2/5;
      const blade=new THREE.Mesh(leaflet,leaf);
      blade.position.set(x+.22*Math.sin(theta),y-.03,z+.22*Math.cos(theta));
      blade.rotation.order='YXZ'; blade.rotation.set(.16,theta,0);
      blade.scale.set(.145,.075,.33); blade.castShadow=true;tree.add(blade);
    }
  }
  return tree;
}

export function createReviewLayout(scene) {
  const room=new THREE.Group();
  scene.add(room);
  const window=enclosure(room);
  backWallFittings(room);
  const shape=counterFootprint();
  const body=millwork(shape,.012,.929,matte('#BBA58E'),'Paneled counter base');
  const slab=millwork(shape,.941,worktopHeight-.941,matte('#F8F7F3'),'Continuous L worktop');
  room.add(body,slab);
  // A few flush panel divisions communicate the scale of the photo's joinery.
  const joint=matte('#A5927E');
  for(const u of [266,445,624,803]) {
    const v=849+(825-849)*(u-89)/(847-89);
    box(room,joint,.009,.84,.012,xAt(u),.478,zAt(v));
  }
  const machine=espressoMachine(room);
  terminal(room);
  const display=pastryCase(room), tree=moneyTree(room);
  const {pan,surface}=createPrepPan();
  pan.name='Prep pan'; pan.position.copy(planPoint(848,638,worktopHeight));pan.scale.setScalar(.62);
  const rim=matte('#6B6E69'), liner=matte('#B8B5A9');
  for(const part of pan.children) if(part.isMesh) part.material=part===surface.parent?liner:rim;
  room.add(pan);
  const guestGlass=planPoint(647,786,worktopHeight);
  const receipt=station(room,'Guest receipt',786,785,worktopHeight+.002);
  scene.add(new THREE.HemisphereLight('#FFFFFF','#C8C4BC',1.85));
  const daylight=new THREE.DirectionalLight('#FFF8E9',1.55);
  daylight.position.copy(window.position).add(new THREE.Vector3(5,5.0,.6));
  daylight.target.position.copy(window.position).add(new THREE.Vector3(-4.8,-.4,-.7));
  daylight.castShadow=true;daylight.shadow.intensity=.40;daylight.shadow.mapSize.set(1024,1024);
  Object.assign(daylight.shadow.camera,{left:-6,right:6,top:5,bottom:-5,near:.1,far:22});
  daylight.shadow.camera.updateProjectionMatrix();daylight.shadow.normalBias=.012;
  scene.add(daylight,daylight.target);
  room.updateMatrixWorld(true);
  return {room,slab,pan,prepSurface:surface,machine,display,tree,window,daylight,guestGlass,receipt};
}

export function frameReviewCamera(camera,width,height) {
  const aspect=width/height;
  if(camera.isOrthographicCamera) {
    const center=planPoint(800,512);
    const viewHeight=Math.max(1024/units,1600/units/aspect);
    camera.left=-viewHeight*aspect/2;camera.right=-camera.left;
    camera.top=viewHeight/2;camera.bottom=-camera.top;
    camera.position.copy(center).y=14;
    camera.up.set(0,0,-1);camera.lookAt(center);
  } else {
    const target=new THREE.Vector3(.05,1.20,.08);
    camera.position.set(2.40,3.42,7.65);
    camera.aspect=aspect;
    // In portrait keep the active service area legible. Wider screens show the full room.
    const roomWidth=THREE.MathUtils.lerp(5.75,11.75,THREE.MathUtils.smoothstep(aspect,.74,1.60));
    const viewHeight=roomWidth/aspect;
    camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(viewHeight/(2*camera.position.distanceTo(target))));
    camera.lookAt(target);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

// The glass exits toward the customer first, clearing the terminal before moving left.
export function positionReviewDrink(target,prep,guest,progress) {
  const travel=Math.min(1,progress);
  target.set(
    THREE.MathUtils.lerp(prep.x,guest.x,progress*progress),
    THREE.MathUtils.lerp(prep.y,guest.y,travel)+.17*Math.sin(Math.PI*travel),
    THREE.MathUtils.lerp(prep.z,guest.z,progress*(2-progress))
  );
}
