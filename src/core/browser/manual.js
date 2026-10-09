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
  if (loaded && body.classList.contains('manual-markdown')) {
    renderManualLinks(body, body.textContent || '');
  }
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
      const markdown = await response.text();
      if (body.classList.contains('manual-markdown')) {
        renderManualLinks(body, markdown);
      } else {
        body.textContent = markdown;
      }
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

/**
 * Render Markdown links as safe anchors while keeping the rest of the manual literal.
 * @param {HTMLElement} body Manual content element.
 * @param {string} markdown Source text.
 * @returns {void}
 */
function renderManualLinks(body, markdown) {
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const fragment = body.ownerDocument.createDocumentFragment();
  let cursor = 0;
  for (const match of markdown.matchAll(pattern)) {
    const fullMatch = match[0];
    const label = match[1];
    const destination = match[2];
    const index = match.index;
    fragment.append(markdown.slice(cursor, index));
    if (isSafeManualHref(destination, body.ownerDocument.baseURI)) {
      const link = body.ownerDocument.createElement('a');
      link.className = 'manual-inline-link';
      link.href = destination;
      link.textContent = label;
      fragment.append(link);
    } else {
      fragment.append(fullMatch);
    }
    cursor = index + fullMatch.length;
  }
  fragment.append(markdown.slice(cursor));
  body.replaceChildren(fragment);
}

/**
 * Accept navigable web URLs and reject executable or unsupported schemes.
 * @param {string} destination Markdown link target.
 * @param {string} baseURI Document base URL.
 * @returns {boolean} Whether the target resolves to HTTP or HTTPS.
 */
function isSafeManualHref(destination, baseURI) {
  try {
    const url = new URL(destination, baseURI);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
