import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frameFixedCamera, WORKTOP_Y, MACHINE_POSITION, MACHINE_YAW, TRAY_GLASS, GUEST_GLASS, GUEST_RECEIPT} from '../src/fixed-room.js';

test('only the machine faces staff; guest anchors are independent on the front of the countertop', () => {
  const front = new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),MACHINE_YAW);
  assert.ok(front.z < -.99);
  assert.equal(MACHINE_POSITION[1],WORKTOP_Y);
  assert.equal(GUEST_GLASS[1],WORKTOP_Y);
  assert.ok(GUEST_GLASS[2] > TRAY_GLASS[2]);
  assert.ok(GUEST_RECEIPT[2] > TRAY_GLASS[2]);
  assert.ok(GUEST_RECEIPT[0]-GUEST_GLASS[0] > 1);
  for(const [x,,z] of [TRAY_GLASS,GUEST_GLASS,GUEST_RECEIPT]) {
    assert.ok(x > -2.45 && x < 2.8 && z > -.4 && z < 1.7);
  }
});

test('desktop and narrow framing keep the machine, tray and both guest pickups visible', () => {
  const camera = new THREE.PerspectiveCamera(36,1,.1,60);
  const props=[MACHINE_POSITION,TRAY_GLASS,GUEST_GLASS,GUEST_RECEIPT];
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
