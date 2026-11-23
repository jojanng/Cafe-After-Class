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

export function frameFixedCamera(camera, width, height) {
  camera.aspect = width / height;
  camera.fov = width <= 600 ? 46 : 36;
  camera.position.set(8.4, 6.3, 12.2);
  camera.lookAt(.2, 2, .65);
  camera.updateProjectionMatrix();
}
