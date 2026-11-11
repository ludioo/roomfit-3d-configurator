import { applyDom, t } from './i18n.js';
import { getState, setState, subscribe as subscribeState } from './state.js';
import { ensureSchema, getLast, setLast } from './storage.js';
import { initShell, setHash } from '../ui/shell.js';
import { subscribeLayoutMode } from './layoutMode.js';
import { initSavedList } from '../ui/savedList.js';
import { initArButton } from '../ui/arButton.js';
import { showToast } from '../ui/toast.js';

function afterFirstPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/** @param {number} [timeout] */
function waitIdle(timeout = 1400) {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout });
    } else {
      setTimeout(resolve, Math.min(timeout, 300));
    }
  });
}

export function init() {
  applyDom();

  const container = document.getElementById('app');
  const splash = document.getElementById('splash');
  const splashPct = document.getElementById('splash-pct');
  const splashStatus = document.getElementById('splash-status');
  const splashRetry = document.getElementById('splash-retry');
  const poster = document.getElementById('webgl-poster');
  if (!container || !splash || !splashPct || !splashStatus || !splashRetry) return;

  ensureSchema();
  const last = getLast();
  if (last) setState(last);

  const saved = initSavedList(document.body, {
    onClose() {
      if ((location.hash || '').replace(/^#/, '') === 'saved') {
        setHash('configure');
      }
    },
  });
  initShell(document.body, { saved });
  const arButton = initArButton(document.body);

  /** @type {(() => Promise<void>) | null} */
  let runScreenshot = null;
  const panelOpts = {
    onSaved() {
      saved.render();
    },
    onScreenshot() {
      return runScreenshot?.();
    },
  };

  /** @type {Awaited<ReturnType<typeof import('../ui/configPanel.js').initConfigPanel>> | null} */
  let configPanel = null;
  let remountSeq = 0;

  async function mountConfigPanel() {
    const { initConfigPanel } = await import('../ui/configPanel.js');
    configPanel = await initConfigPanel(document.body, panelOpts);
    return configPanel;
  }

  const configPanelReady = (async () => {
    await afterFirstPaint();
    await waitIdle(500);
    return mountConfigPanel();
  })().catch((err) => {
    console.error('[configPanel]', err);
  });

  subscribeLayoutMode(() => {
    const seq = ++remountSeq;
    void (async () => {
      try {
        await configPanelReady;
        if (seq !== remountSeq) return;
        configPanel?.destroy();
        configPanel = null;
        await mountConfigPanel();
      } catch (err) {
        console.error('[configPanel remount]', err);
      }
    })();
  });

  let storageFailToasted = false;
  /** @param {{ productId: string, fabricColor: string, finish: string, size: string }} snapshot */
  function persistLast(snapshot) {
    if (setLast(snapshot)) return;
    if (storageFailToasted) return;
    storageFailToasted = true;
    showToast(t('toast.storageFail'));
  }

  subscribeState((next) => {
    persistLast(next);
  });
  persistLast(getState());

  void (async () => {
    await afterFirstPaint();
    try {
      const { bootViewer } = await import('../scene/bootViewer.js');
      await bootViewer({
        container,
        splash,
        splashPct,
        splashStatus,
        splashRetry,
        poster,
        arButton,
        configPanelReady,
        setScreenshotRunner(fn) {
          runScreenshot = fn;
        },
      });
    } catch (err) {
      console.error('[bootViewer]', err);
      splash.hidden = true;
      splash.setAttribute('aria-hidden', 'true');
      if (poster) {
        poster.hidden = false;
        applyDom(poster);
      }
    }
  })();
}
