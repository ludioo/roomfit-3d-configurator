import { PerspectiveCamera } from 'three';

const IDLE_MS = 5000;
/** rad/s — slow studio spin */
const IDLE_AZIMUTH_SPEED = 0.15;

/**
 * Perspective camera + orbit controls (camera-controls loaded lazily).
 * @param {import('three').WebGLRenderer} renderer
 * @param {{ width: number, height: number }} size
 * @param {{ invalidate?: () => void }} [opts]
 */
export async function createCamera(renderer, size, opts = {}) {
  const invalidate = opts.invalidate;
  const camera = new PerspectiveCamera(45, size.width / size.height, 0.1, 100);
  camera.position.set(2.5, 1.6, 3.2);
  camera.lookAt(0, 0.5, 0);

  const [
    { default: CameraControls },
    {
      Box3,
      Matrix4,
      Quaternion,
      Raycaster,
      Sphere,
      Spherical,
      Vector2,
      Vector3,
      Vector4,
    },
  ] = await Promise.all([import('camera-controls'), import('three')]);

  CameraControls.install({
    THREE: {
      Vector2,
      Vector3,
      Vector4,
      Quaternion,
      Matrix4,
      Spherical,
      Box3,
      Sphere,
      Raycaster,
    },
  });

  const controls = new CameraControls(camera, renderer.domElement);
  controls.minDistance = 1.2;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minPolarAngle = 0.05;
  controls.setLookAt(2.5, 1.6, 3.2, 0, 0.5, 0, false);

  const reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionMq.matches;
  let lastInteractAt = performance.now();
  let idle = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let idleTimer = null;

  function armIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (reducedMotion) return;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      idle = true;
      invalidate?.();
    }, IDLE_MS);
  }

  function bumpInteract() {
    lastInteractAt = performance.now();
    idle = false;
    armIdleTimer();
    invalidate?.();
  }

  controls.addEventListener('controlstart', bumpInteract);
  controls.addEventListener('control', bumpInteract);
  controls.addEventListener('controlend', bumpInteract);
  renderer.domElement.addEventListener('wheel', bumpInteract, { passive: true });

  function onReducedMotionChange() {
    reducedMotion = reducedMotionMq.matches;
    if (reducedMotion) {
      idle = false;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    } else {
      armIdleTimer();
    }
  }
  reducedMotionMq.addEventListener('change', onReducedMotionChange);
  armIdleTimer();

  renderer.domElement.addEventListener('furncfg:resize', (e) => {
    const { width, height } = /** @type {CustomEvent} */ (e).detail;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  });

  /**
   * @param {number} dt
   * @returns {boolean} whether camera moved
   */
  function update(dt) {
    if (!reducedMotion) {
      const now = performance.now();
      if (!idle && now - lastInteractAt >= IDLE_MS) idle = true;
      if (idle) {
        controls.rotate(IDLE_AZIMUTH_SPEED * dt, 0, false);
      }
    }
    return controls.update(dt);
  }

  /**
   * @param {boolean} on
   */
  function setEnabled(on) {
    controls.enabled = on;
    if (on) bumpInteract();
  }

  return { camera, controls, update, setEnabled };
}
