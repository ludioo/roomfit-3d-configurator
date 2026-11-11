import { applyDom, getLang, subscribe as subscribeLang, t } from '../core/i18n.js';
import { deleteConfig, listConfigs } from '../core/storage.js';
import { setState } from '../core/state.js';
import { showToast } from './toast.js';
import { iconHtml, icons } from './icons.js';
import { runUiMotion } from './motion.js';

const OPEN_S = 0.2;
const CLOSE_S = 0.16;

/**
 * @param {HTMLElement} mountParent
 * @param {{ onClose?: () => void }} [options]
 */
export function initSavedList(mountParent, options = {}) {
  const root = document.createElement('div');
  root.className = 'saved-panel';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <div class="saved-panel__dialog">
      <header class="saved-panel__header">
        <h2 class="saved-panel__title" id="saved-title" data-i18n="saved.title"></h2>
        <button type="button" class="saved-panel__close" data-close data-i18n-aria="saved.close">
          ${iconHtml(icons.x)}
        </button>
      </header>
      <div class="saved-panel__empty" data-empty>
        <p data-i18n="saved.empty"></p>
        <button type="button" class="saved-panel__empty-cta" data-empty-cta data-i18n="saved.emptyCta"></button>
      </div>
      <ul class="saved-panel__list" data-list hidden></ul>
    </div>
  `;
  root.setAttribute('aria-labelledby', 'saved-title');
  mountParent.append(root);
  applyDom(root);

  const emptyEl = /** @type {HTMLElement} */ (root.querySelector('[data-empty]'));
  const emptyCta = /** @type {HTMLButtonElement | null} */ (root.querySelector('[data-empty-cta]'));
  const listEl = /** @type {HTMLElement} */ (root.querySelector('[data-list]'));
  const dialog = /** @type {HTMLElement} */ (root.querySelector('.saved-panel__dialog'));
  const closeBtn = root.querySelector('[data-close]');
  let animGen = 0;

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat(getLang() === 'id' ? 'id-ID' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function render() {
    const configs = listConfigs();
    listEl.replaceChildren();
    const empty = configs.length === 0;
    emptyEl.hidden = !empty;
    listEl.hidden = empty;
    if (empty) return;

    for (const cfg of configs.slice().reverse()) {
      const li = document.createElement('li');
      li.className = 'saved-item';
      li.dataset.id = cfg.id;
      li.innerHTML = `
        <div class="saved-item__meta">
          <span class="saved-item__name"></span>
          <span class="saved-item__date"></span>
        </div>
        <div class="saved-item__actions">
          <button type="button" class="saved-item__btn" data-load></button>
          <button type="button" class="saved-item__btn saved-item__btn--danger" data-delete>
            ${iconHtml(icons.trash, 'icon icon--sm')}
          </button>
        </div>
      `;
      li.querySelector('.saved-item__name').textContent = cfg.name;
      li.querySelector('.saved-item__date').textContent = formatDate(cfg.createdAt);
      const loadBtn = /** @type {HTMLButtonElement} */ (li.querySelector('[data-load]'));
      loadBtn.textContent = t('saved.load');
      const delBtn = /** @type {HTMLButtonElement} */ (li.querySelector('[data-delete]'));
      delBtn.setAttribute('aria-label', t('saved.delete'));

      loadBtn.addEventListener('click', () => {
        setState({
          productId: cfg.productId,
          fabricColor: cfg.fabricColor,
          finish: cfg.finish,
          size: cfg.size,
        });
        close();
      });

      delBtn.addEventListener('click', () => {
        const result = deleteConfig(cfg.id);
        if (!result.ok) {
          showToast(t('toast.storageFail'));
          return;
        }
        render();
      });

      listEl.append(li);
    }
  }

  function open() {
    const gen = ++animGen;
    render();
    root.hidden = false;
    root.style.opacity = '0';
    dialog.style.opacity = '0';
    dialog.style.transform = 'translateY(8px)';
    closeBtn instanceof HTMLElement && closeBtn.focus();
    void Promise.all([
      runUiMotion(root, { opacity: [0, 1] }, { duration: OPEN_S }),
      runUiMotion(
        dialog,
        {
          opacity: [0, 1],
          transform: ['translateY(8px)', 'translateY(0px)'],
        },
        { duration: OPEN_S },
      ),
    ]).then(() => {
      if (gen !== animGen) return;
    });
  }

  function close() {
    if (root.hidden) return;
    const gen = ++animGen;
    void (async () => {
      await Promise.all([
        runUiMotion(root, { opacity: [1, 0] }, { duration: CLOSE_S }),
        runUiMotion(
          dialog,
          {
            opacity: [1, 0],
            transform: ['translateY(0px)', 'translateY(8px)'],
          },
          { duration: CLOSE_S },
        ),
      ]);
      if (gen !== animGen) return;
      root.hidden = true;
      root.style.opacity = '';
      dialog.style.opacity = '';
      dialog.style.transform = '';
      options.onClose?.();
    })();
  }

  function isOpen() {
    return !root.hidden;
  }

  closeBtn?.addEventListener('click', () => close());
  emptyCta?.addEventListener('click', () => {
    close();
    setTimeout(() => {
      const saveBtn = document.querySelector('[data-save]');
      if (saveBtn instanceof HTMLElement) saveBtn.focus();
    }, 0);
  });
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === 'Escape' && isOpen()) close();
  }
  document.addEventListener('keydown', onKey);

  const unsubLang = subscribeLang(() => {
    applyDom(root);
    if (isOpen()) render();
  });

  return {
    root,
    render,
    open,
    close,
    isOpen,
    destroy() {
      document.removeEventListener('keydown', onKey);
      unsubLang();
      root.remove();
    },
  };
}
