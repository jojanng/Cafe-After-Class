import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createIngredientReward} from '../src/service-counter.js';
import {createReviewLayout, frameReviewCamera, planPoint, positionReviewDrink, reviewGlassScale, worktopHeight} from '../src/review-layout.js';

const layout = createReviewLayout(new THREE.Scene());
const {room, slab, pan, prepSurface, guestGlass, receipt} = layout;
const down = new THREE.Vector3(0, -1, 0);
const up = new THREE.Vector3(0, 1, 0);
const world = object => object.getWorldPosition(new THREE.Vector3());
function topAt(point, objects) {
  return new THREE.Raycaster(new THREE.Vector3(point.x, 5, point.z), down).intersectObjects(objects, false)[0];
}

test('the drawing and the orthographic view share axes, scale and an open staff aisle', () => {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 60);
  frameReviewCamera(camera, 1600, 1024);
  for (const [u, v] of [[0, 0], [1600, 1024], [389, 704], [878, 434], [1515, 444]]) {
    const screen = planPoint(u, v, worktopHeight).project(camera);
    assert.ok(Math.abs((screen.x + 1) * 800 - u) < 1e-8);
    assert.ok(Math.abs((1 - screen.y) * 512 - v) < 1e-8);
  }
  for (const [u, v] of [[115, 706], [650, 777], [865, 719], [885, 308]]) {
    assert.ok(Math.abs(topAt(planPoint(u, v), [slab]).point.y - worktopHeight) < 1e-6);
  }
  const rear = room.getObjectByName('Separate rear strip');
  assert.ok(topAt(planPoint(515, 210), rear.children));
  for (const [u, v] of [[302, 400], [672, 475], [935, 262], [1187, 340]]) {
    assert.equal(topAt(planPoint(u, v), [slab, ...rear.children]), undefined);
  }
  const drip = layout.machine.getObjectByName('Staff drip tray');
  assert.ok(world(drip).z < layout.machine.position.z);
  assert.ok(layout.machine.position.x < room.getObjectByName('Point of sale').position.x);
  assert.ok(layout.display.position.x < layout.tree.position.x && layout.tree.position.x < layout.window.position.x);
  assert.ok(layout.daylight.target.position.x < layout.daylight.position.x);
  assert.equal(room.children.filter(item => item.name === 'Hanging banner').length, 2);
});

test('the landed packet is supported across its foot and the guest items are separate on the slab', () => {
  const reward = createIngredientReward(prepSurface, null, new THREE.MeshBasicMaterial());
  for (const remaining of [1, .5, 0, 1, 0]) {
    reward.place(remaining);
    room.updateMatrixWorld(true);
    const foot = new THREE.Box3().setFromObject(reward.packet, true);
    for (const x of [foot.min.x, foot.max.x]) {
      for (const z of [foot.min.z, foot.max.z]) {
        const support = topAt({x, z}, pan.children);
        assert.equal(support?.object, prepSurface.parent);
        const gap = foot.min.y - support.point.y;
        assert.ok(remaining ? gap > 0 : Math.abs(gap) < 1e-6);
      }
    }
  }
  reward.group.removeFromParent();
  const glassRadius = .255 * reviewGlassScale;
  for (const [spot, halfWidth, halfDepth] of [[guestGlass, glassRadius, glassRadius], [world(receipt), .335, .15]]) {
    assert.ok(spot.z > world(prepSurface).z);
    for (const x of [spot.x - halfWidth, spot.x + halfWidth]) {
      for (const z of [spot.z - halfDepth, spot.z + halfDepth]) {
        assert.equal(topAt({x, z}, [slab, ...pan.children])?.object, slab);
      }
    }
  }
  assert.ok(guestGlass.x + glassRadius < world(receipt).x - .335);
  const prep = world(prepSurface);
  const obstacles = [layout.machine, layout.display, room.getObjectByName('Point of sale')].map(station =>
    new THREE.Box3().setFromObject(station, true).expandByScalar(glassRadius));
  for (let sample = 0; sample <= 41; sample++) {
    const center = new THREE.Vector3();
    positionReviewDrink(center, prep, guestGlass, sample / 40);
    center.addScaledVector(up, .15);
    assert.ok(obstacles.every(obstacle => !obstacle.containsPoint(center)), 'the sliding glass clears the equipment');
  }
});

test('the customer sightline reaches each service spot, and wide views include the return, tree and window', () => {
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 60);
  const stationary = [];
  room.traverse(object => { if (object.isMesh) stationary.push(object); });
  let orientation;
  for (const [width, height] of [[1600, 900], [2160, 690], [768, 890], [390, 534], [320, 258]]) {
    frameReviewCamera(camera, width, height);
    orientation ??= camera.quaternion.clone();
    assert.ok(orientation.equals(camera.quaternion));
    for (const spot of [world(prepSurface), guestGlass, world(receipt)]) {
      const projected = spot.clone().project(camera);
      assert.ok(Math.max(Math.abs(projected.x), Math.abs(projected.y)) < .86);
      const direction = spot.clone().sub(camera.position);
      const ray = new THREE.Raycaster(camera.position, direction.clone().normalize(), .1, direction.length() - .005);
      assert.equal(ray.intersectObjects(stationary, false).length, 0, 'no equipment blocks the service spot');
    }
    if (width >= 1440) {
      for (const corner of [planPoint(83, 842, worktopHeight), planPoint(983, 269, worktopHeight),
        layout.tree.position.clone().addScaledVector(up, 1.8), planPoint(1515, 238, 2), planPoint(1515, 650, 2)]) {
        const projected = corner.project(camera);
        assert.ok(Math.max(Math.abs(projected.x), Math.abs(projected.y)) < .99);
      }
    }
  }
});
