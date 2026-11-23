import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {finish, oakVeneer} from './corner-materials.js';
import {COUNTER, PAN_POSITION, WORKTOP_Y} from './fixed-room.js';

function outline(shape, x, z, r) {
  shape.moveTo(-x+r,-z); shape.lineTo(x-r,-z); shape.quadraticCurveTo(x,-z,x,-z+r);
  shape.lineTo(x,z-r); shape.quadraticCurveTo(x,z,x-r,z); shape.lineTo(-x+r,z);
  shape.quadraticCurveTo(-x,z,-x,z-r); shape.lineTo(-x,-z+r); shape.quadraticCurveTo(-x,-z,-x+r,-z);
  return shape;
}

// The origin is the underside. The plan radius is independent of the edge bevel.
function slab(width, depth, height, radius, bevel=.008, rimWidth=0) {
  const x = width/2-bevel, z = depth/2-bevel;
  const shape = outline(new THREE.Shape(), x, z, radius);
  if (rimWidth) shape.holes.push(outline(new THREE.Path(), x-rimWidth, z-rimWidth, radius-rimWidth));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height-2*bevel, bevelEnabled: true, bevelSegments: 2,
    bevelSize: bevel, bevelThickness: bevel, curveSegments: 6
  });
  geo.rotateX(-Math.PI/2);
  geo.translate(0, bevel, 0);
  return geo;
}

// Map the long axis of the oak grain up each panel, including the short return.
function veneer(part, leafOffset=0) {
  const {position, normal, uv} = part.geometry.attributes;
  for (let i=0; i<position.count; i++) {
    const across = Math.abs(normal.getX(i)) > .7 ? position.getZ(i) : position.getX(i);
    uv.setXY(i, across/2.2+leafOffset, position.getY(i)/1.8+.25);
  }
}

function addJoinery(bar) {
  const {x, z, width, depth, slabBottom, slabThickness} = COUNTER;
  const oakMap = oakVeneer();
  const timber = color => new THREE.MeshStandardMaterial({color, map: oakMap, roughness: .66});
  const frame = timber('#B99A7E'), field = timber('#C2A085'), backing = timber('#A88A72');
  const w = width-.14, d = depth-.13, toe = .105, rail = .079;
  const faceZ = z+d/2, endX = x+w/2;
  const fieldHeight = slabBottom-toe-2*rail;
  const middle = toe+rail+fieldHeight/2;

  bar.mesh(slab(w-.14,d-.13,toe,.12), finish('#806C5B'), x,.014,z);
  veneer(bar.mesh(slab(w,d,slabBottom-toe,.16), backing, x,toe,z));
  for (const bottom of [toe,slabBottom-rail]) {
    veneer(bar.mesh(slab(w+.066,d+.066,rail,.168), frame,x,bottom,z));
  }

  // Four broad leaves share a shallow frame. The fields sit behind its face.
  const span = w-.35, bay = span/4, left = x-span/2;
  for (let i=0; i<4; i++) {
    const panel = bar.box(bay-.080,fieldHeight-.027,.028,field,left+(i+.5)*bay,middle,faceZ+.004,.007);
    veneer(panel,i*.31);
  }
  for (let i=0; i<=4; i++) {
    veneer(bar.box(.048,fieldHeight,.06,frame,left+i*bay,middle,faceZ+.003,.009),i*.22);
  }
  const endSpan = d-.34;
  veneer(bar.box(.028,fieldHeight-.027,endSpan-.08,field,endX+.004,middle,z,.007),.64);
  for (const edge of [-1,1]) {
    veneer(bar.box(.06,fieldHeight,.048,frame,endX+.003,middle,z+edge*endSpan/2,.009));
  }
  bar.mesh(slab(width,depth,slabThickness,.19,.017), finish('#F6F4EE',.48), x,slabBottom,z);
}

function addPastryCase(bar) {
  const x = COUNTER.x+COUNTER.width/2-.78, z = .34;
  const w = 1.24, d = .70, h = .66, sill = WORKTOP_Y+.070;
  const frame = finish('#44433E',.42,.22), deck = finish('#FFF7EA',.48);
  const glass = new THREE.MeshStandardMaterial({
    color: '#DBE7E4', roughness: .19, transparent: true, opacity: .14, depthWrite: false
  });
  bar.box(w+.04,.070,d+.04,frame,x,WORKTOP_Y+.035,z,.016);
  bar.box(w-.035,.025,d-.035,deck,x,sill+.0125,z,.009);
  bar.box(w,h,d,glass,x,sill+h/2,z,.008);
  for (const side of [-1,1]) {
    const edgeZ = z+side*(d/2-.012), edgeX = x+side*(w/2-.012);
    bar.box(w,.026,.024,frame,x,sill+h,edgeZ,.005);
    bar.box(.024,.026,d-.048,frame,edgeX,sill+h,z,.005);
    for (const end of [-1,1]) {
      bar.box(.024,h,.024,frame,x+end*(w/2-.012),sill+h/2,edgeZ,.004);
    }
  }
  const shelfY = sill+h*.48;
  bar.box(w-.046,.019,d-.07,glass,x,shelfY,z,.004);
  bar.box(w-.046,.013,.014,finish('#AAB7B0',.32),x,shelfY,z+(d-.07)/2,.003);
  bar.box(.53,.014,.34,finish('#FFFFFF',.53),x+.06,shelfY+.017,z+.025,.006);
  const crust = finish('#B67C48'), cut = finish('#D8B17C');
  for (const [dx,dz,y,angle] of [[-.29,.045,sill+.025,-.10],[.25,-.015,sill+.025,.18],[.06,.025,shelfY+.024,-.22]]) {
    const bun = bar.mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),crust,x+dx,y,z+dz);
    bun.scale.set(.19,.094,.112);
    bun.rotation.y = angle;
    for (const offset of [-.061,.032]) {
      const score = bar.mesh(new THREE.SphereGeometry(1,10,6),cut,x+dx+offset,y+.085,z+dz);
      score.scale.set(.013,.009,.046);
      score.rotation.y = angle-.42;
    }
  }
}

export function createPrepPan() {
  const pan = new THREE.Group();
  pan.position.set(...PAN_POSITION);
  const w = 1.22, d = .84, r = .112, baseHeight = .034, wall = .042;
  const enamel = finish('#453C38',.50);
  function part(geometry, material, bottom) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = bottom;
    mesh.castShadow = mesh.receiveShadow = true;
    pan.add(mesh);
    return mesh;
  }
  part(slab(w,d,baseHeight,r,.005),finish('#2B2C7A',.46),0);
  part(slab(w,d,.052,r,.004,wall),enamel,baseHeight);
  const liner = part(slab(w-2*wall-.016,d-2*wall-.016,.018,r-wall-.008,.003),finish('#B99B79'),baseHeight);

  // Attach both the packet foot and brew station to the actual upper face of the liner.
  liner.geometry.computeBoundingBox();
  const bounds = liner.geometry.boundingBox;
  const surface = new THREE.Group();
  bounds.getCenter(surface.position);
  surface.position.y = bounds.max.y;
  liner.add(surface);
  return {pan, surface};
}

export function createServiceCounter(bar) {
  addJoinery(bar);
  addPastryCase(bar);
  const counter = bar.batch();
  const {pan, surface} = createPrepPan();
  counter.add(pan);
  return {counter, surface};
}

export function createIngredientReward(surface, labelTexture, contactMaterial) {
  const group = new THREE.Group(), packet = new THREE.Group();
  surface.add(group);
  group.add(packet);
  const body = new THREE.Mesh(new RoundedBoxGeometry(.43,.50,.20,2,.022), finish('#E1C89E'));
  body.geometry.computeBoundingBox();
  body.position.y = -body.geometry.boundingBox.min.y;
  body.castShadow = true;
  packet.add(body);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(.36,.36),
    new THREE.MeshStandardMaterial({color: '#FFFFFF', map: labelTexture, roughness: .92}));
  label.position.set(0,.265,.1005);
  packet.add(label);
  packet.rotation.y = .23;

  const shade = new THREE.Mesh(new THREE.PlaneGeometry(.56,.31), contactMaterial.clone());
  shade.rotation.order = 'YXZ';
  shade.rotation.set(-Math.PI/2,packet.rotation.y,0);
  shade.position.y = .0008;
  group.add(shade);
  function place(remaining) {
    packet.position.set(-.10*remaining,.27*remaining,-.035*remaining);
    shade.position.x = packet.position.x;
    shade.position.z = packet.position.z;
    shade.scale.setScalar(1+.28*remaining);
    shade.material.opacity = .46-.34*remaining;
  }
  group.visible = false;
  place(0);
  return {group, packet, place};
}
