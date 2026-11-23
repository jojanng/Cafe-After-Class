import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {oakGrain, paintedMap, stillLife} from './corner-materials.js';
import { MACHINE_POSITION, MACHINE_YAW } from './fixed-room.js';

const finish = (color, roughness=.72, metalness=0) => new THREE.MeshStandardMaterial({color, roughness, metalness});

// Batch fixed sub-parts by material within each prop.
function workshop() {
  const parts = [];
  function mesh(geometry, material, x, y, z) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x,y,z); parts.push(part); return part;
  }
  function box(w,h,d,material,x,y,z,r=.025) {
    return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/2,h/2,d/2)),material,x,y,z);
  }
  function cylinder(rt,rb,h,material,x,y,z,n=24) {
    return mesh(new THREE.CylinderGeometry(rt,rb,h,n),material,x,y,z);
  }
  function rod(start,end,r,material) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const mid = a.clone().lerp(b,.5), axis = b.sub(a);
    const part = cylinder(r,r,axis.length(),material,mid.x,mid.y,mid.z,12);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
  }
  function batch() {
    const buckets = new Map(), group = new THREE.Group();
    for (const part of parts) {
      part.updateMatrix();
      const geo = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
      geo.applyMatrix4(part.matrix);
      if (!buckets.has(part.material)) buckets.set(part.material,[]);
      buckets.get(part.material).push(geo);
    }
    for (const [material, geometries] of buckets) {
      const object = new THREE.Mesh(mergeGeometries(geometries), material);
      object.castShadow = !material.transparent;
      object.receiveShadow = true;
      group.add(object);
      geometries.forEach(g=>g.dispose());
    }
    return group;
  }
  return {mesh,box,cylinder,rod,batch};
}

function roundedOutline(s, x, z, r) {
  s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);
  s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);s.quadraticCurveTo(-x,z,-x,z-r);
  s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
  return s;
}

// The plan radius is independent of thickness. An optional opening turns a slab into a rim.
function curvedSlab(width,depth,height,radius,bevel=.025,rimWidth=0) {
  const x=width/2-bevel, z=depth/2-bevel;
  const s=roundedOutline(new THREE.Shape(),x,z,radius);
  if (rimWidth) s.holes.push(roundedOutline(new THREE.Path(),x-rimWidth,z-rimWidth,radius-rimWidth));
  const geo=new THREE.ExtrudeGeometry(s,{depth:height-2*bevel,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel,curveSegments:9});
  geo.rotateX(-Math.PI/2);geo.translate(0,bevel,0);
  const uv=geo.attributes.uv, pos=geo.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/width+.5,(pos.getZ(i)+pos.getY(i))/depth+.5);
  return geo;
}

// Light trapped at a surface contact. The feather belongs to the object and stays under its footprint.
function contactMaterial() {
  const map = paintedMap(256, 128, (ctx) => {
    ctx.filter = 'blur(7px)';
    ctx.fillStyle = '#513c2b';
    ctx.beginPath();
    ctx.roundRect(17, 15, 222, 98, 16);
    ctx.fill();
  });
  return new THREE.MeshBasicMaterial({map, transparent:true, opacity:.36, depthWrite:false});
}

function contact(parent, material, width, depth, x, y, z) {
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);
  shadow.rotation.x = -Math.PI/2;
  shadow.position.set(x,y,z);
  shadow.raycast = () => {};
  parent.add(shadow);
}

// Four paper panels taper into a folded seam, giving each bag a pinched top and broad foot.
function foldedBag(height) {
  const vertices=[], outline=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const levels=[[.13,.085,0],[.151,.089,.10],[.153,.070,height*.68],[.137,.015,height]];
  const point=(level,i)=>[outline[i][0]*level[0],level[2],outline[i][1]*level[1]];
  for(let k=0;k<levels.length-1;k++)for(let i=0;i<4;i++){
    const j=(i+1)%4, a=point(levels[k],i),b=point(levels[k],j),c=point(levels[k+1],i),d=point(levels[k+1],j);
    vertices.push(...a,...c,...b,...c,...d,...b);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(vertices.length/3*2).fill(0),2));
  geo.computeVertexNormals();
  return geo;
}

export function createServiceCorner(scene, metalReflections) {
  const charcoal=finish('#414043'), lacquer=finish('#514e4e',.54), reveal=finish('#24272a');
  const copper=finish('#b87951',.34,.52), satin=finish('#cccac0',.28,.72), rubber=finish('#2c3031',.56);
  const porcelain=finish('#eee1c9',.33), jade=finish('#4f8077',.38), clay=finish('#b65e42',.43);
  const grain=oakGrain();
  const oak=new THREE.MeshStandardMaterial({color:'#b58045',map:grain,roughness:.48});
  const walnut=new THREE.MeshStandardMaterial({color:'#78553d',map:grain,roughness:.53});
  const metalLight=finish('#ddd5c2',.34,.46), coffee=finish('#4a3027');
  for (const metal of [satin, copper, metalLight]) {
    metal.envMap = metalReflections;
    metal.envMapIntensity = .5;
  }
  const woodAccent=finish('#ad7a52');
  const contactShade=contactMaterial();
  const bar=workshop();
  bar.mesh(curvedSlab(5.43,1.89,.17,.43),reveal,.2,.014,.65);
  bar.mesh(curvedSlab(5.64,2.08,1.51,.50),charcoal,.2,.16,.65);
  bar.mesh(curvedSlab(5.65,2.09,.042,.50,.009),copper,.2,1.63,.65);
  bar.mesh(curvedSlab(5.71,2.13,.065,.52,.012),reveal,.2,1.667,.65);
  bar.mesh(curvedSlab(5.85,2.28,.226,.56,.028),oak,.2,1.732,.65);
  // Three broad inset joinery panels form the customer-facing apron.
  for(const x of [-1.23,.20,1.63])bar.box(1.417,1.38,.024,lacquer,x,.907,1.687,.011);
  // The smoked wood tray has a raised rim and a removable cork liner. Its left edge clears the served glass.
  bar.mesh(curvedSlab(1.13,.88,.074,.16,.009),walnut,.87,1.958,1.05);
  bar.mesh(curvedSlab(1.12,.87,.035,.156,.004,.045),walnut,.87,2.029,1.05);
  bar.mesh(curvedSlab(1.025,.777,.02,.111,.003),finish('#bf9f76'),.87,2.032,1.05);

  const machine=workshop();
  // Local origin is its base. The chassis encloses the pump; the brew bay is open at the front.
  machine.box(1.98,.115,.89,rubber,0,.058,0,.05);
  machine.box(1.95,.105,.85,satin,0,.159,.005,.04);
  machine.box(1.78,.66,.32,charcoal,0,.50,-.235,.08);
  machine.box(1.65,.48,.035,metalLight,0,.49,-.051);
  // Plain brushed backplate: this is the face the guest actually sees.
  machine.box(1.57,.43,.024,satin,0,.54,-.400,.022);
  for(const x of [-.91,.91]){
    machine.box(.145,.82,.76,jade,x,.59,-.025,.069);
    machine.box(.154,.31,.735,copper,x,.86,-.008,.074);
  }
  // Recessed vents under the rounded end cap pick up a slim highlight at the inspection angle.
  for (const side of [-1, 1]) for (const z of [-.17, -.09, -.01, .07, .15]) {
    machine.box(.007,.19,.025,rubber,side*.985,.535,z,.003);
  }
  machine.box(1.86,.29,.76,satin,0,.88,-.008,.09);
  machine.box(1.62,.11,.035,charcoal,0,.883,.374,.026);
  machine.rod([-.76,.766,.309],[.76,.766,.309],.025,satin);
  for(const x of [-.58,-.44,.43,.57])machine.cylinder(.033,.033,.02,metalLight,x,.885,.40,16).rotation.x=Math.PI/2;
  // Manometer with ivory face and a dark needle.
  machine.cylinder(.104,.104,.038,copper,0,.89,.40).rotation.x=Math.PI/2;
  machine.cylinder(.083,.083,.009,porcelain,0,.89,.423).rotation.x=Math.PI/2;
  machine.rod([0,.89,.431],[-.042,.928,.431],.009,rubber);
  machine.box(1.59,.033,.43,rubber,0,.225,.181,.014);
  for(let i=0;i<9;i++)machine.box(1.52,.012,.013,satin,0,.245,.003+i*.044,.004);
  for(const x of [-.43,.43]){
    machine.cylinder(.132,.117,.088,satin,x,.708,.201);
    machine.cylinder(.115,.084,.078,copper,x,.631,.201);
    machine.rod([x,.65,.25],[x+.09,.65,.40],.028,satin);
    machine.rod([x+.09,.65,.40],[x+.20,.66,.56],.039,walnut);
    machine.cylinder(.023,.02,.065,satin,x,.569,.217,12);
  }
  machine.rod([.73,.72,.25],[.79,.44,.32],.019,satin);
  machine.rod([.79,.44,.32],[.74,.34,.42],.019,satin);
  for(const x of [-.82,.82])machine.rod([x,1.02,-.30],[x,1.13,-.30],.02,copper);
  machine.rod([-.82,1.13,-.30],[.82,1.13,-.30],.02,copper);
  function cup(shop,x,y,z,material,size=1) {
    const profile=[[.074,0],[.088,.018],[.125,.095],[.131,.155],[.12,.16],[.113,.142],[.097,.069],[.072,.041],[0,.041]];
    shop.mesh(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r*size,h*size)),24),material,x,y,z);
    const handle=shop.mesh(new THREE.TorusGeometry(.05*size,.014*size,8,20),material,x+.127*size,y+.092*size,z);
    handle.scale.x=.78;
  }
  cup(machine,-.43,.25,.205,clay);cup(machine,.43,.25,.205,porcelain);
  cup(machine,-.57,1.025,-.08,porcelain,.91);cup(machine,-.26,1.025,-.09,jade,.85);
  machine.cylinder(.165,.142,.024,porcelain,.45,1.036,-.015);
  cup(machine,.45,1.049,-.015,clay,.94);
  // Model-local +Z is the controls and brew bay. Staff stand at world −Z.
  // Turn only the machine; the counter and guest pickup still face world +Z.
  const espresso=machine.batch();espresso.position.set(...MACHINE_POSITION);
  espresso.scale.setScalar(.96);espresso.rotation.y=MACHINE_YAW;
  const service=bar.batch();service.add(espresso);scene.add(service);
  contact(service,contactShade,6.34,2.70,.2,.020,.65);
  contact(service,contactShade,2.15,1.12,espresso.position.x,1.962,espresso.position.z);

  const back=workshop();
  back.box(4.6,1.13,.76,charcoal,.2,.70,-2.68,.045);
  back.box(4.41,.14,.67,reveal,.2,.07,-2.69);
  back.box(4.72,.145,.87,oak.clone(),.2,1.335,-2.68,.045);
  for(const x of [-1.31,.18,1.67])back.box(1.46,.96,.028,lacquer,x,.70,-2.289,.018);
  // Two gusseted coffee pouches and a grinder share the back worktop.
  for(const [x,z,h,band] of [[-.87,-2.52,.47,clay],[-.46,-2.64,.53,jade]]){
    back.mesh(foldedBag(h),finish('#d2b588'),x,1.407,z);
    back.box(.279,.043,.041,woodAccent,x,1.416+h,z,.008);
    back.box(.21,.13,.012,band,x,1.58,z+.085,.005);
  }
  const gx=1.55,gz=-2.60;
  back.box(.44,.062,.44,rubber,gx,1.439,gz+.04);
  back.box(.32,.50,.27,jade,gx,1.708,gz-.035,.048);
  back.cylinder(.17,.12,.07,satin,gx,1.986,gz-.04);
  const hopperGlass=new THREE.MeshStandardMaterial({color:'#b5b9a7',roughness:.24,transparent:true,opacity:.56,depthWrite:false});
  back.cylinder(.19,.086,.198,coffee,gx,2.12,gz-.04,28);
  back.cylinder(.205,.095,.24,hopperGlass,gx,2.139,gz-.04,28);
  back.cylinder(.206,.214,.035,walnut,gx,2.277,gz-.04,28);
  back.box(.17,.115,.16,satin,gx,1.79,gz+.11,.024);
  back.cylinder(.046,.039,.071,copper,gx,1.702,gz+.143,16);
  back.cylinder(.08,.057,.12,copper,gx,1.532,gz+.12,20);
  cup(back,.85,1.408,-2.52,clay,1.08);cup(back,.51,1.408,-2.66,porcelain,.93);
  const backbar=back.batch();scene.add(backbar);

  const shelf=workshop();
  shelf.box(2.22,.069,.38,walnut,0,2.345,-2.876,.023);
  for(const x of [-.83,.83])shelf.box(.065,.145,.32,copper,x,2.243,-2.955,.015);
  for(let i=0;i<3;i++)shelf.cylinder(.171,.129,.028,porcelain,-.77,2.394+i*.028,-2.85);
  cup(shelf,-.34,2.38,-2.84,jade,1.12);
  const carafe=[[.108,0],[.146,.044],[.143,.168],[.068,.239],[.064,.30],[.08,.31],[.067,.32],[.052,.30]];
  shelf.mesh(new THREE.LatheGeometry(carafe.map(([r,h])=>new THREE.Vector2(r,h)),24),clay,.62,2.38,-2.87);
  const rack=shelf.batch();scene.add(rack);

  for(const [x,subject] of [[-.68,'fruit'],[.37,'cup']]){
    const frame=workshop();frame.box(.96,1.27,.044,walnut,0,0,0,.016);
    frame.mesh(new THREE.PlaneGeometry(.885,1.19),stillLife(subject),0,0,.023);
    const group=frame.batch();group.position.set(x,3.47,-3.085);scene.add(group);
  }
}
