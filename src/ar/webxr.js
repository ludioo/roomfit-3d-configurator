import {
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  Vector3,
} from 'three';
import { track } from '../core/analytics.js';

let active = false;

/**
 * Write hit-test pose onto product root without inheriting XR matrix scale.
 * @param {import('three').Object3D} root
 * @param {ArrayLike<number>} elements Column-major 4x4 matrix
 * @param {number} scale Uniform studio size scale to keep
 */
export function applyHitPose(root, elements, scale) {
  const mat = new Matrix4().fromArray(elements);
  const pos = new Vector3();
  const quat = new Quaternion();
  const hitScale = new Vector3();
  mat.decompose(pos, quat, hitScale);
  root.position.copy(pos);
  root.quaternion.copy(quat);
  root.scale.setScalar(scale);
}

/**
 * Start immersive-ar + hit-test; places the live product root on tap.
 * @param {{
 *   renderer: import('three').WebGLRenderer,
 *   scene: import('three').Scene,
 *   camera: import('three').PerspectiveCamera,
 *   getRoot: () => import('three').Object3D | null,
 *   ground: import('three').Object3D,
 *   stopStudio: () => void,
 *   startStudio: () => void,
 *   setPassthrough: (on: boolean) => void,
 *   syncSize: () => void,
 *   setControlsEnabled: (on: boolean) => void,
 * }} ctx
 */
export async function startWebxr(ctx) {
  if (active) return;
  if (!navigator.xr?.requestSession) throw new Error('WebXR unavailable');

  const product = ctx.getRoot();
  if (!product) throw new Error('No product loaded');

  const {
    renderer,
    scene,
    camera,
    ground,
    stopStudio,
    startStudio,
    setPassthrough,
    syncSize,
    setControlsEnabled,
  } = ctx;

  active = true;

  const studio = {
    pos: product.position.clone(),
    quat: product.quaternion.clone(),
    scale: product.scale.clone(),
    visible: product.visible,
    groundVisible: ground.visible,
    background: scene.background,
    fov: camera.fov,
    aspect: camera.aspect,
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
  };

  stopStudio();
  setControlsEnabled(false);
  setPassthrough(true);
  ground.visible = false;
  product.visible = false;

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');

  /** @type {XRHitTestSource | null} */
  let hitTestSource = null;

  const reticle = new Mesh(
    new RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffffff }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const controller = renderer.xr.getController(0);
  scene.add(controller);

  function onSelect() {
    if (!reticle.visible) return;
    const root = ctx.getRoot();
    if (!root) return;
    applyHitPose(root, reticle.matrix.elements, studio.scale.x);
    root.visible = true;
  }

  controller.addEventListener('select', onSelect);

  function abortSetup() {
    controller.removeEventListener('select', onSelect);
    scene.remove(controller);
    scene.remove(reticle);
    reticle.geometry.dispose();
    reticle.material.dispose();
    ground.visible = studio.groundVisible;
    product.visible = studio.visible;
    scene.background = studio.background;
    setPassthrough(false);
    renderer.xr.enabled = false;
    setControlsEnabled(true);
    startStudio();
    active = false;
  }

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (hitTestSource) {
      hitTestSource.cancel();
      hitTestSource = null;
    }
    controller.removeEventListener('select', onSelect);
    scene.remove(controller);
    scene.remove(reticle);
    reticle.geometry.dispose();
    reticle.material.dispose();

    const root = ctx.getRoot();
    if (root) {
      root.position.copy(studio.pos);
      root.quaternion.copy(studio.quat);
      root.scale.copy(studio.scale);
      root.visible = studio.visible;
    }
    ground.visible = studio.groundVisible;
    scene.background = studio.background;
    setPassthrough(false);

    camera.fov = studio.fov;
    camera.aspect = studio.aspect;
    camera.near = studio.near;
    camera.far = studio.far;
    camera.zoom = studio.zoom;
    camera.scale.set(1, 1, 1);
    camera.updateProjectionMatrix();

    renderer.setAnimationLoop(null);
    renderer.xr.enabled = false;
    syncSize();
    setControlsEnabled(true);
    startStudio();
    active = false;
  }

  /** @type {XRSession} */
  let session;
  try {
    session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
    });
  } catch (err) {
    abortSetup();
    throw err;
  }

  session.addEventListener('end', cleanup);

  try {
    await renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } catch (err) {
    try {
      await session.end();
    } catch {
      cleanup();
    }
    throw err;
  }

  track('ar_enter', { platform: 'webxr' });

  renderer.setAnimationLoop((_t, frame) => {
    if (frame && hitTestSource) {
      const refSpace = renderer.xr.getReferenceSpace();
      const hits = frame.getHitTestResults(hitTestSource);
      if (hits.length > 0) {
        const pose = hits[0].getPose(refSpace);
        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else {
          reticle.visible = false;
        }
      } else {
        reticle.visible = false;
      }
    }
    renderer.render(scene, camera);
  });
}
