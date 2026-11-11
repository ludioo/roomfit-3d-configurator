import { CanvasTexture, Scene } from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { track } from '../core/analytics.js';

/** 1×1 transparent GIF — Apple requires an <img> child of rel=ar. */
const FALLBACK_IMG =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Multiply RGBA bytes in-place by linear color factors (0–1).
 * @param {Uint8ClampedArray | number[]} data
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function multiplyImageDataByColor(data, r, g, b) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * r);
    data[i + 1] = Math.round(data[i + 1] * g);
    data[i + 2] = Math.round(data[i + 2] * b);
  }
}

/**
 * Bake material.color into map on a cloned material; reset color to white.
 * No-op if missing map/image or color already white.
 * @param {import('three').MeshStandardMaterial} material
 * @returns {boolean}
 */
export function bakeColorIntoMap(material) {
  const map = material.map;
  if (!map?.image || !material.color) return false;

  const { r, g, b } = material.color;
  if (r === 1 && g === 1 && b === 1) return false;

  const img = map.image;
  const w = img.width || img.videoWidth || img.naturalWidth || 0;
  const h = img.height || img.videoHeight || img.naturalHeight || 0;
  if (!w || !h) return false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    multiplyImageDataByColor(imageData.data, r, g, b);
    ctx.putImageData(imageData, 0, 0);

    const baked = new CanvasTexture(canvas);
    baked.colorSpace = map.colorSpace;
    baked.flipY = map.flipY;
    baked.wrapS = map.wrapS;
    baked.wrapT = map.wrapT;
    baked.repeat.copy(map.repeat);
    baked.offset.copy(map.offset);
    baked.center.copy(map.center);
    baked.rotation = map.rotation;
    baked.needsUpdate = true;

    material.map = baked;
    material.color.setRGB(1, 1, 1);
    material.needsUpdate = true;
    return true;
  } catch {
    // ponytail: canvas/ImageBitmap edge cases — leave color×map for exporter
    return false;
  }
}

/**
 * Deep-enough clone: recursive object + per-mesh material.clone (textures shared until bake).
 * @param {import('three').Object3D} root
 * @returns {import('three').Object3D}
 */
export function prepareCloneForExport(root) {
  const clone = root.clone(true);
  clone.traverse((obj) => {
    if (!obj.isMesh) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => (m?.clone ? m.clone() : m));
    } else if (obj.material?.clone) {
      obj.material = obj.material.clone();
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m?.isMeshStandardMaterial) bakeColorIntoMap(m);
    }
  });
  return clone;
}

/**
 * @param {string} [ua]
 * @returns {boolean}
 */
export function isIosUa(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1) {
    return true;
  }
  return false;
}

/**
 * Dispose materials (and baked canvas maps) on an export-only clone. Do not dispose geometries.
 * @param {import('three').Object3D} root
 */
function disposeExportClone(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.map?.isCanvasTexture) m.map.dispose();
      m.dispose?.();
    }
  });
}

/**
 * Export product root to USDZ and open Quick Look (iOS) or download (other).
 * @param {import('three').Object3D | null | undefined} root
 */
export async function exportAndOpen(root) {
  if (!root) throw new Error('USDZ: no product root');

  const clone = prepareCloneForExport(root);
  const exportScene = new Scene();
  exportScene.add(clone);

  let url = '';
  try {
    const exporter = new USDZExporter();
    const bytes = await exporter.parseAsync(exportScene, { quickLookCompatible: true });
    const blob = new Blob([bytes], { type: 'model/vnd.usdz+zip' });
    url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.rel = 'ar';
    a.href = url;
    if (!isIosUa()) a.download = 'config.usdz';

    const img = document.createElement('img');
    img.src = FALLBACK_IMG;
    img.alt = '';
    a.appendChild(img);

    document.body.appendChild(a);
    a.click();
    a.remove();
    track('ar_enter', { platform: 'quicklook' });
  } finally {
    disposeExportClone(clone);
    exportScene.remove(clone);
    // Quick Look may still fetch the blob after click; revoke after a long delay.
    if (url) setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
