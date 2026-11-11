/**
 * Web Share with files is reliable on mobile OS sheets; Windows desktop Share often hangs.
 * @param {string} [ua]
 * @returns {boolean}
 */
export function isMobileShareHost(ua = '') {
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

/**
 * @param {{ share?: Function, canShare?: Function, userAgent?: string }} nav
 * @param {File} file
 * @returns {boolean}
 */
export function shouldAttemptShare(nav, file) {
  if (!isMobileShareHost(nav?.userAgent ?? '')) return false;
  return (
    typeof nav?.share === 'function' &&
    typeof nav?.canShare === 'function' &&
    nav.canShare({ files: [file] })
  );
}

/**
 * Render once then capture PNG. Does not enable preserveDrawingBuffer.
 * @param {{ render: Function, domElement: HTMLCanvasElement }} renderer
 * @param {unknown} scene
 * @param {unknown} camera
 * @returns {Promise<Blob>}
 */
export function capturePng(renderer, scene, camera) {
  renderer.render(scene, camera);
  const canvas = renderer.domElement;
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('toBlob unsupported'));
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob failed'));
    }, 'image/png');
  });
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadPng(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Prefer Web Share with file; fall back to download.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {Promise<'share' | 'download' | 'aborted'>}
 */
export async function shareOrDownloadPng(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (shouldAttemptShare(navigator, file)) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'share';
    } catch (err) {
      if (err && /** @type {{ name?: string }} */ (err).name === 'AbortError') {
        return 'aborted';
      }
    }
  }
  downloadPng(blob, filename);
  return 'download';
}
