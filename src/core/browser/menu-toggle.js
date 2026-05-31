/**
 * Create the handle that wires the mobile menu toggle controls.
 * @param {{
 *   documentObj: Document,
 *   addKeydownListener: (listener: (event: KeyboardEvent) => void) => void,
 *   setTimeoutFn: (listener: () => void, delay: number) => unknown,
 * }} deps Browser dependencies.
 * @returns {() => void} Mobile menu setup handle.
 */
export function createMobileMenuToggleHandle({
  documentObj,
  addKeydownListener,
  setTimeoutFn,
}) {
  return function handleMobileMenuToggle() {
    const toggle =
      /** @type {HTMLElement | null} */ (
        documentObj.querySelector('.menu-toggle')
      );
    const overlay = documentObj.getElementById('mobile-menu');
    if (!toggle || !overlay) {
      return;
    }

    const sheet =
      /** @type {HTMLElement | null} */ (overlay.querySelector('.menu-sheet'));
    const closeBtn =
      /** @type {HTMLButtonElement | null} */ (
        overlay.querySelector('.menu-close')
      );
    const openMenu = createOpenMenu({ documentObj, toggle, overlay, sheet });
    const closeMenu = createCloseMenu({
      documentObj,
      toggle,
      overlay,
      setTimeoutFn,
    });

    toggle.addEventListener('click', () => {
      if (overlay.hidden) {
        openMenu();
        return;
      }

      closeMenu();
    });
    closeBtn?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        closeMenu();
      }
    });
    addKeydownListener(event => {
      if (event.key === 'Escape' && !overlay.hidden) {
        closeMenu();
      }
    });
  };
}

/**
 * Create the open-menu action.
 * @param {{
 *   documentObj: Document,
 *   toggle: HTMLElement,
 *   overlay: HTMLElement,
 *   sheet: HTMLElement | null,
 * }} deps Open-menu dependencies.
 * @returns {() => void} Open-menu action.
 */
function createOpenMenu({ documentObj, toggle, overlay, sheet }) {
  return function openMenu() {
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    documentObj.body.style.overflow = 'hidden';
    const first =
      /** @type {HTMLElement | null} */ (
        sheet?.querySelector('a,button,[tabindex="0"]') ?? null
      );
    first?.focus();
  };
}

/**
 * Create the close-menu action.
 * @param {{
 *   documentObj: Document,
 *   toggle: HTMLElement,
 *   overlay: HTMLElement,
 *   setTimeoutFn: (listener: () => void, delay: number) => unknown,
 * }} deps Close-menu dependencies.
 * @returns {() => void} Close-menu action.
 */
function createCloseMenu({ documentObj, toggle, overlay, setTimeoutFn }) {
  return function closeMenu() {
    overlay.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    documentObj.body.style.overflow = '';
    setTimeoutFn(() => {
      overlay.hidden = true;
    }, 180);
    toggle.focus();
  };
}
