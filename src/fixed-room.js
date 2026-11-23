// Guest side is world +Z; the staff aisle and rear worktop are −Z.
export const COUNTER = Object.freeze({
  x: .20, z: .72, width: 6.74, depth: 1.90, slabBottom: 1.48, slabThickness: .115
});
export const WORKTOP_Y = COUNTER.slabBottom + COUNTER.slabThickness;
const guestEdge = COUNTER.z + COUNTER.depth / 2;
export const MACHINE_POSITION = Object.freeze([-2.03, WORKTOP_Y, .49]);
export const MACHINE_YAW = Math.PI + .07;
export const PAN_POSITION = Object.freeze([-.30, WORKTOP_Y, guestEdge - .64]);
export const GUEST_GLASS = Object.freeze([.68, WORKTOP_Y, guestEdge - .275]);
export const GUEST_RECEIPT = Object.freeze([2.10, WORKTOP_Y + .008, guestEdge - .34]);
export const PASTRY_CASE = Object.freeze({x: COUNTER.x+COUNTER.width/2-.78, z: .34, width: 1.24, depth: .70});

const cameraPosition = [4.85, 3.85, 8.40];
const counterCenter = [.46, 1.78, .70];
const focusDistance = Math.hypot(...cameraPosition.map((p, i) => p-counterCenter[i]));

export function frameFixedCamera(camera, width, height) {
  camera.aspect = width/height;
  camera.position.set(...cameraPosition);
  camera.lookAt(...counterCenter);
  // At the focal plane, keep the entire counter width and the span from its toe to the pendants.
  const viewHeight = Math.max(7.65/camera.aspect, 6.06);
  camera.fov = 2*Math.atan(viewHeight/(2*focusDistance))*180/Math.PI;
  camera.updateProjectionMatrix();
}
