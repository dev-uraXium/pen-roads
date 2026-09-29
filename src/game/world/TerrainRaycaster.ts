import * as THREE from 'three';

const RAY_ORIGIN_HEIGHT = 600;
const RAY_MAX_DISTANCE = 1200;
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);

/**
 * Samples the true physical/visual mesh surface height at (x, z) by raycasting downward.
 * Returns null if no terrain/road collider is loaded at the target position.
 */
export function getTerrainHeightAt(x: number, z: number, colliders: THREE.Object3D[]): number | null {
  if (!colliders || colliders.length === 0) return null;

  const origin = new THREE.Vector3(x, RAY_ORIGIN_HEIGHT, z);
  raycaster.set(origin, downVector);
  raycaster.far = RAY_MAX_DISTANCE;

  const hits = raycaster.intersectObjects(colliders, true);
  if (hits.length === 0) {
    return null;
  }

  return hits[0].point.y;
}
