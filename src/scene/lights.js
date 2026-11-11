import { DirectionalLight, HemisphereLight, PMREMGenerator } from 'three';
import { isDesktopLayout } from '../core/layoutMode.js';

/**
 * Cheap studio fill (no PMREM). Used on mobile / until IBL is ready.
 * @param {import('three').Scene} scene
 */
export function setupSimpleLights(scene) {
  if (scene.getObjectByName('furncfg-hemi')) return;
  const hemi = new HemisphereLight(0xf0f4ff, 0x1a1e26, 1.05);
  hemi.name = 'furncfg-hemi';
  scene.add(hemi);
  const key = new DirectionalLight(0xffffff, 1.35);
  key.name = 'furncfg-key';
  key.position.set(4.5, 8, 5);
  scene.add(key);
}

/**
 * Studio IBL via RoomEnvironment + PMREM (desktop only — mobile skips for TBT).
 * @param {import('three').Scene} scene
 * @param {import('three').WebGLRenderer} renderer
 */
export async function setupEnvironment(scene, renderer) {
  setupSimpleLights(scene);
  if (!isDesktopLayout()) return null;

  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = new RoomEnvironment();
  const envMap = pmrem.fromScene(env).texture;
  scene.environment = envMap;
  env.dispose();
  pmrem.dispose();
  return envMap;
}
