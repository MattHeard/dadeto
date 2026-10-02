/**
 * Wire an accessible manual toggle, fetching referenced prose only on demand.
 * @param {HTMLElement} manual Manual container.
 * @param {typeof fetch} fetchText Resource reader.
 * @returns {void}
 */
export function initializeManual(manual, fetchText) {
  const body = manual.querySelector('.manual-body');
  const toggle = manual.querySelector('[data-manual-toggle]');
  if (!(body instanceof HTMLElement) || !(toggle instanceof HTMLElement)) {
    return;
  }
  let loaded = !manual.dataset.manualSrc;
  let pending = false;
  toggle.addEventListener('click', async event => {
    event.preventDefault();
    body.hidden = !body.hidden;
    toggle.textContent = body.hidden ? 'show' : 'hide';
    toggle.setAttribute('aria-expanded', String(!body.hidden));
    if (body.hidden || loaded || pending) {
      return;
    }
    pending = true;
    body.textContent = 'Loading manual…';
    body.setAttribute('aria-busy', 'true');
    try {
      const response = await fetchText(String(manual.dataset.manualSrc));
      if (!response.ok) {
        throw new Error('Manual request failed');
      }
      body.textContent = await response.text();
      loaded = true;
    } catch {
      body.textContent =
        'Could not load this manual. Close and reopen to retry.';
    } finally {
      pending = false;
      body.setAttribute('aria-busy', 'false');
    }
  });
}
