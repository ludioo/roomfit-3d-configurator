import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';

let tipSeq = 0;

/**
 * Hover/focus tooltip positioned with @floating-ui/dom.
 * @param {HTMLElement} anchor
 * @param {() => string} getText
 * @returns {{ destroy: () => void, updateText: () => void }}
 */
export function attachTooltip(anchor, getText) {
  /** @type {HTMLElement | null} */
  let tip = null;
  /** @type {(() => void) | null} */
  let stopAuto = null;
  const tipId = `furncfg-tip-${++tipSeq}`;

  function place() {
    if (!tip) return;
    void computePosition(anchor, tip, {
      placement: 'top',
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      if (!tip) return;
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
    });
  }

  function show() {
    const text = getText();
    if (!text) return;
    if (tip) {
      tip.textContent = text;
      place();
      return;
    }
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.id = tipId;
    tip.setAttribute('role', 'tooltip');
    tip.textContent = text;
    document.body.append(tip);
    anchor.setAttribute('aria-describedby', tipId);
    stopAuto = autoUpdate(anchor, tip, place);
    place();
  }

  function hide() {
    stopAuto?.();
    stopAuto = null;
    tip?.remove();
    tip = null;
    anchor.removeAttribute('aria-describedby');
  }

  function onEnter() {
    show();
  }
  function onLeave() {
    hide();
  }

  anchor.addEventListener('pointerenter', onEnter);
  anchor.addEventListener('pointerleave', onLeave);
  anchor.addEventListener('focus', onEnter);
  anchor.addEventListener('blur', onLeave);

  return {
    updateText() {
      const text = getText();
      if (!text) {
        hide();
        return;
      }
      if (tip) tip.textContent = text;
    },
    destroy() {
      hide();
      anchor.removeEventListener('pointerenter', onEnter);
      anchor.removeEventListener('pointerleave', onLeave);
      anchor.removeEventListener('focus', onEnter);
      anchor.removeEventListener('blur', onLeave);
    },
  };
}
