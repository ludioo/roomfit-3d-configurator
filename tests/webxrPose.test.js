import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyHitPose } from '../src/ar/webxr.js';

describe('applyHitPose', () => {
  it('applies hit position and rotation while keeping the given scale', () => {
    const root = new THREE.Object3D();
    const hit = new THREE.Matrix4().compose(
      new THREE.Vector3(1, 0.2, -1.5),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
      new THREE.Vector3(4, 4, 4),
    );

    applyHitPose(root, hit.elements, 1.25);

    expect(root.position.x).toBeCloseTo(1);
    expect(root.position.y).toBeCloseTo(0.2);
    expect(root.position.z).toBeCloseTo(-1.5);
    expect(root.scale.x).toBeCloseTo(1.25);
    expect(root.scale.y).toBeCloseTo(1.25);
    expect(root.scale.z).toBeCloseTo(1.25);

    const euler = new THREE.Euler().setFromQuaternion(root.quaternion, 'YXZ');
    expect(euler.y).toBeCloseTo(Math.PI / 2, 5);
  });
});
