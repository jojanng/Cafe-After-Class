// Guest side is world +Z; the staff aisle and rear worktop are −Z.
export const WORKTOP_Y = 1.958;
export const MACHINE_POSITION = Object.freeze([-1.61, WORKTOP_Y, .82]);
export const MACHINE_YAW = Math.PI + .07;
export const TRAY_GLASS = Object.freeze([.72, 2.053, 1.06]);
export const GUEST_GLASS = Object.freeze([.10, WORKTOP_Y, 1.46]);
export const GUEST_RECEIPT = Object.freeze([1.8, 2.02, 1.48]);

export function frameFixedCamera(camera, width, height) {
  camera.aspect = width / height;
  camera.fov = width <= 600 ? 46 : 36;
  camera.position.set(8.4, 6.3, 12.2);
  camera.lookAt(.2, 2, .65);
  camera.updateProjectionMatrix();
}
