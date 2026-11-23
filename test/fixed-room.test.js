import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frameFixedCamera, COUNTER, WORKTOP_Y, MACHINE_POSITION, MACHINE_YAW, GUEST_GLASS, GUEST_RECEIPT} from '../src/fixed-room.js';
import {createPrepPan, createIngredientReward} from '../src/service-counter.js';

test('only the machine faces staff; guest anchors are independent on the front of the countertop', () => {
  const front = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),MACHINE_YAW);
  const prep = createPrepPan().surface.getWorldPosition(new THREE.Vector3()).toArray();
  assert.ok(front.z < -.99);
  assert.equal(MACHINE_POSITION[1],WORKTOP_Y);
  assert.equal(GUEST_GLASS[1],WORKTOP_Y);
  assert.ok(GUEST_GLASS[2] > prep[2]);
  assert.ok(GUEST_RECEIPT[2] > prep[2]);
  assert.ok(GUEST_RECEIPT[0]-GUEST_GLASS[0] > 1);
  for(const [x,,z] of [prep,GUEST_GLASS,GUEST_RECEIPT]) {
    assert.ok(Math.abs(x-COUNTER.x) < COUNTER.width/2 && Math.abs(z-COUNTER.z) < COUNTER.depth/2);
  }
});

test('desktop and narrow framing keep the machine, tray and both guest pickups visible', () => {
  const camera = new THREE.PerspectiveCamera(36,1,.1,60);
  const prep = createPrepPan().surface.getWorldPosition(new THREE.Vector3()).toArray();
  const props=[MACHINE_POSITION,prep,GUEST_GLASS,GUEST_RECEIPT];
  for (const [width,height] of [[1440,1000],[1024,768],[601,844],[390,650],[320,650]]) {
    frameFixedCamera(camera,width,height);
    camera.updateMatrixWorld();
    for(const point of props) {
      const projection=new THREE.Vector3(...point).project(camera);
      assert.ok(Math.abs(projection.x) < .84);
      assert.ok(Math.abs(projection.y) < .7);
    }
    const glass=new THREE.Vector3(...GUEST_GLASS).project(camera);
    const receipt=new THREE.Vector3(...GUEST_RECEIPT).project(camera);
    assert.ok((receipt.x-glass.x)*width/2 > 50, 'guest paper does not cover served glass');
  }
  assert.deepEqual(camera.position.toArray(),[8.4,6.3,12.2]);
});

test('the whole packet lands on the liner, inside the raised rim, from every arrival pose', () => {
  const {pan, surface} = createPrepPan();
  const reward = createIngredientReward(surface, null, new THREE.MeshBasicMaterial());
  const down = new THREE.Vector3(0,-1,0);
  const bounds = new THREE.Box3();
  const epsilon = 1e-6;
  // Measure the real surfaces from above. The first hit would be the rim for an oversized packet.
  const supportAt = (x,z) => new THREE.Raycaster(new THREE.Vector3(x,5,z),down)
    .intersectObjects(pan.children,false)[0];
  for (const remaining of [1,.5,.125,0]) {
    reward.place(remaining);
    pan.updateMatrixWorld(true);
    bounds.setFromObject(reward.packet,true);
    const center = bounds.getCenter(new THREE.Vector3());
    for (const x of [bounds.min.x,center.x,bounds.max.x]) {
      for (const z of [bounds.min.z,center.z,bounds.max.z]) {
        const hit = supportAt(x,z);
        assert.equal(hit?.object,surface.parent,'the liner spans the packet footprint');
        const gap = bounds.min.y-hit.point.y;
        if (remaining) assert.ok(gap>0,'the moving packet clears the pan');
        else assert.ok(Math.abs(gap)<epsilon,'the settled packet foot touches the liner');
      }
    }
  }
  const landed = bounds.clone();
  reward.place(1);
  reward.place(0); // sync, resize and reduced motion use this same immediate landing
  pan.updateMatrixWorld(true);
  assert.deepEqual(bounds.setFromObject(reward.packet,true),landed);
  const [x,,z] = GUEST_GLASS;
  assert.equal(supportAt(x,z),undefined,'the pickup point clears the pan');
});
