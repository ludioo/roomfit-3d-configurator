import { Box3, Color } from 'three';
import productsData from '../data/products.json';

/**
 * @param {import('three').Object3D} root
 * @returns {{ meshes: string[], materials: string[] }}
 */
export function inspectMaterials(root) {
  const meshes = [];
  const materials = new Set();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    meshes.push(obj.name || '(unnamed)');
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m?.name) materials.add(m.name);
    }
  });
  return { meshes, materials: [...materials] };
}

/**
 * @param {import('three').Object3D} root
 */
function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const val = m[key];
          if (val && val.isTexture) val.dispose();
        }
        m.dispose();
      }
    }
  });
}

/**
 * @param {import('three').Object3D} root
 * @param {number} scale
 */
function groundAlign(root, scale) {
  root.position.y = 0;
  root.scale.setScalar(scale);
  const box = new Box3().setFromObject(root);
  const minY = box.min.y;
  if (Number.isFinite(minY) && minY !== 0) {
    root.position.y -= minY;
  }
}

/**
 * @param {import('three').Scene} scene
 * @param {{
 *   onProgress?: (pct: number) => void,
 *   onError?: (err: Error) => void,
 * }} [hooks]
 */
export function createProductController(scene, hooks = {}) {
  /** @type {Awaited<ReturnType<typeof import('./loader.js').createModelLoader>> | null} */
  let loader = null;
  /** @type {import('three').Object3D | null} */
  let current = null;
  /** @type {string | null} */
  let currentId = null;

  async function ensureLoader() {
    if (!loader) {
      const { createModelLoader } = await import('./loader.js');
      loader = createModelLoader(hooks);
    }
    return loader;
  }

  function getProduct(id) {
    const product = productsData.products?.find((p) => p.id === id);
    if (!product) throw new Error(`Unknown product: ${id}`);
    return product;
  }

  function forBodyMaterials(fn) {
    if (!current || !currentId) return;
    const product = getProduct(currentId);
    const names = new Set(product.bodyMaterialNames ?? []);
    if (names.size === 0) return;
    current.traverse((obj) => {
      if (!obj.isMesh) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m?.name || !names.has(m.name)) continue;
        fn(m);
      }
    });
  }

  /**
   * Tint body materials by hex. Keeps existing texture maps.
   * @param {string} hex
   */
  function applyColor(hex) {
    const color = new Color(hex);
    forBodyMaterials((m) => {
      if (!m.color) return;
      m.color.copy(color);
      m.needsUpdate = true;
    });
  }

  /**
   * @param {{ roughness: number, metalness: number }} finish
   */
  function applyFinish(finish) {
    forBodyMaterials((m) => {
      if ('roughness' in m) m.roughness = finish.roughness;
      if ('metalness' in m) m.metalness = finish.metalness;
      m.needsUpdate = true;
    });
  }

  /**
   * Scale root by product defaultScale × size option scale, then re-ground.
   * @param {number} sizeScale
   */
  function applySize(sizeScale) {
    if (!current || !currentId) return;
    const product = getProduct(currentId);
    const base = product.defaultScale ?? 1;
    groundAlign(current, base * sizeScale);
  }

  /**
   * @param {string} productId
   * @param {{
   *   fabricColorHex?: string,
   *   finish?: { roughness: number, metalness: number },
   *   sizeScale?: number,
   *   isStale?: () => boolean,
   * }} [opts]
   */
  async function load(productId, opts = {}) {
    const product = getProduct(productId);
    const modelLoader = await ensureLoader();
    const root = await modelLoader.load(product.modelUrl);
    if (opts.isStale?.()) {
      disposeObject(root);
      return null;
    }
    root.name = productId;
    const sizeScale = opts.sizeScale ?? 1;
    groundAlign(root, (product.defaultScale ?? 1) * sizeScale);

    if (current) {
      scene.remove(current);
      disposeObject(current);
    }
    scene.add(root);
    current = root;
    currentId = productId;

    if (opts.fabricColorHex) applyColor(opts.fabricColorHex);
    if (opts.finish) applyFinish(opts.finish);

    const debugOn =
      typeof location !== 'undefined' &&
      /(?:\?|&)debug=(?:1|true)(?:&|$)/.test(location.search);
    /** @type {{ meshes: string[], materials: string[] } | null} */
    let info = null;
    if (debugOn) {
      info = inspectMaterials(root);
      console.info(`[product] ${productId} materials:`, info.materials, 'meshes:', info.meshes);
    }
    return { root, product, info };
  }

  return {
    load,
    applyColor,
    applyFinish,
    applySize,
    getCurrentId: () => currentId,
    getCurrentRoot: () => current,
    getProduct,
    listProducts: () => productsData.products ?? [],
    dispose() {
      if (current) {
        scene.remove(current);
        disposeObject(current);
        current = null;
        currentId = null;
      }
      loader?.dispose?.();
      loader = null;
    },
  };
}
