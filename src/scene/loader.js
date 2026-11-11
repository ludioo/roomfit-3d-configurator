import { LoadingManager } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = '/decoders/draco/';

/**
 * @param {{
 *   onProgress?: (pct: number) => void,
 *   onError?: (err: Error) => void,
 * }} [hooks]
 */
export function createModelLoader(hooks = {}) {
  const manager = new LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (!total) return;
    hooks.onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
  };
  manager.onError = (url) => {
    hooks.onError?.(new Error(`Failed to load ${url}`));
  };

  const draco = new DRACOLoader(manager);
  draco.setDecoderPath(DRACO_PATH);

  const gltf = new GLTFLoader(manager);
  gltf.setDRACOLoader(draco);

  return {
    manager,
    /**
     * @param {string} url
     * @returns {Promise<import('three').Group>}
     */
    load(url) {
      return new Promise((resolve, reject) => {
        gltf.load(
          url,
          (result) => resolve(result.scene),
          undefined,
          (err) => reject(err instanceof Error ? err : new Error(String(err))),
        );
      });
    },
    dispose() {
      draco.dispose();
    },
  };
}
