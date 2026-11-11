/**
 * Dev-only FPS + material/light knobs. Loaded only when ?debug=1|true.
 *
 * @param {{
 *   renderer: import('three').WebGLRenderer,
 *   products: {
 *     getCurrentRoot: () => import('three').Object3D | null,
 *     getCurrentId: () => string | null,
 *     getProduct: (id: string) => { bodyMaterialNames?: string[] },
 *   },
 * }} ctx
 * @returns {Promise<{ update: () => void }>}
 */
export async function mountDebugPanel({ renderer, products }) {
  const [{ GUI }, statsMod] = await Promise.all([import('lil-gui'), import('stats.js')]);
  const Stats = statsMod.default;

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const params = {
    color: '#ffffff',
    roughness: 0.5,
    metalness: 0,
    exposure: renderer.toneMappingExposure,
  };

  function bodyMaterials() {
    const root = products.getCurrentRoot();
    const id = products.getCurrentId();
    if (!root || !id) return [];
    const names = new Set(products.getProduct(id).bodyMaterialNames ?? []);
    if (names.size === 0) return [];
    /** @type {import('three').Material[]} */
    const mats = [];
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of list) {
        if (m?.name && names.has(m.name)) mats.push(m);
      }
    });
    return mats;
  }

  function syncFromScene() {
    const m = bodyMaterials()[0];
    if (m?.color) params.color = `#${m.color.getHexString()}`;
    if (m && 'roughness' in m) params.roughness = m.roughness;
    if (m && 'metalness' in m) params.metalness = m.metalness;
    params.exposure = renderer.toneMappingExposure;
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }

  const gui = new GUI({ title: 'Debug' });
  const matFolder = gui.addFolder('Material');
  matFolder.addColor(params, 'color').onChange((hex) => {
    for (const m of bodyMaterials()) {
      if (!m.color) continue;
      m.color.set(hex);
      m.needsUpdate = true;
    }
  });
  matFolder.add(params, 'roughness', 0, 1, 0.01).onChange((v) => {
    for (const m of bodyMaterials()) {
      if ('roughness' in m) {
        m.roughness = v;
        m.needsUpdate = true;
      }
    }
  });
  matFolder.add(params, 'metalness', 0, 1, 0.01).onChange((v) => {
    for (const m of bodyMaterials()) {
      if ('metalness' in m) {
        m.metalness = v;
        m.needsUpdate = true;
      }
    }
  });
  matFolder.open();

  const lightFolder = gui.addFolder('Light');
  lightFolder.add(params, 'exposure', 0.1, 2, 0.01).onChange((v) => {
    renderer.toneMappingExposure = v;
  });
  lightFolder.open();

  gui.add({ refresh: syncFromScene }, 'refresh').name('Refresh from scene');
  syncFromScene();

  return {
    update() {
      stats.update();
    },
  };
}
