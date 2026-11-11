import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  bakeColorIntoMap,
  isIosUa,
  multiplyImageDataByColor,
  prepareCloneForExport,
} from '../src/ar/usdz.js';

describe('multiplyImageDataByColor', () => {
  it('multiplies RGB channels and leaves alpha', () => {
    const data = new Uint8ClampedArray([200, 100, 50, 255]);
    multiplyImageDataByColor(data, 0.5, 0.5, 0.5);
    expect(data[0]).toBe(100);
    expect(data[1]).toBe(50);
    expect(data[2]).toBe(25);
    expect(data[3]).toBe(255);
  });
});

describe('bakeColorIntoMap', () => {
  it('no-ops when material has no map', () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    expect(bakeColorIntoMap(mat)).toBe(false);
    expect(mat.color.getHex()).toBe(0xff0000);
  });

  it('no-ops when color is already white', () => {
    const canvas = { width: 1, height: 1 };
    const map = new THREE.Texture(canvas);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map });
    expect(bakeColorIntoMap(mat)).toBe(false);
    expect(mat.map).toBe(map);
  });
});

describe('prepareCloneForExport', () => {
  it('clones materials so the live root is untouched', () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x336699 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    const root = new THREE.Group();
    root.add(mesh);

    const clone = prepareCloneForExport(root);
    const clonedMesh = clone.children[0];
    expect(clonedMesh.material).not.toBe(mat);
    expect(clonedMesh.material.color.getHex()).toBe(0x336699);
    expect(mat.color.getHex()).toBe(0x336699);
  });
});

describe('isIosUa', () => {
  it('detects iPhone UA', () => {
    expect(isIosUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605')).toBe(
      true,
    );
  });

  it('rejects desktop Chrome UA', () => {
    expect(
      isIosUa(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe(false);
  });
});
