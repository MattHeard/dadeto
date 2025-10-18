export const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';

export const DEFAULT_ADMIN_ENDPOINTS = {
  triggerRenderContentsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-trigger-render-contents',
  markVariantDirtyUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-mark-variant-dirty',
  generateStatsUrl:
    'https://europe-west1-irien-465710.cloudfunctions.net/prod-generate-stats',
};

/**
 * Provide a fresh copy of the default admin endpoints to avoid shared mutation.
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}}
 */
export function getDefaultAdminEndpointsCopy() {
  return { ...DEFAULT_ADMIN_ENDPOINTS };
}

/**
 * Normalize static config into admin endpoints with production fallbacks.
 * @param {Record<string, string>} config
 * @returns {{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}}
 */
export function mapConfigToAdminEndpoints(config) {
  return {
    triggerRenderContentsUrl:
      config?.triggerRenderContentsUrl ??
      DEFAULT_ADMIN_ENDPOINTS.triggerRenderContentsUrl,
    markVariantDirtyUrl:
      config?.markVariantDirtyUrl ?? DEFAULT_ADMIN_ENDPOINTS.markVariantDirtyUrl,
    generateStatsUrl:
      config?.generateStatsUrl ?? DEFAULT_ADMIN_ENDPOINTS.generateStatsUrl,
  };
}

/**
 * Build the admin endpoints promise using a provided static config loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for the static config.
 * @returns {Promise<{triggerRenderContentsUrl: string, markVariantDirtyUrl: string, generateStatsUrl: string}>}
 */
export function createAdminEndpointsPromise(loadStaticConfigFn) {
  if (typeof loadStaticConfigFn !== 'function') {
    return Promise.resolve(getDefaultAdminEndpointsCopy());
  }

  return loadStaticConfigFn()
    .then(mapConfigToAdminEndpoints)
    .catch(getDefaultAdminEndpointsCopy);
}

/**
 * Create a memoized admin endpoints getter backed by a promise factory.
 * @param {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} createAdminEndpointsPromiseFn - Function that produces the admin endpoints promise.
 * @returns {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} Function returning a memoized admin endpoints promise.
 */
export function createGetAdminEndpoints(createAdminEndpointsPromiseFn) {
  if (typeof createAdminEndpointsPromiseFn !== 'function') {
    throw new TypeError('createAdminEndpointsPromiseFn must be a function');
  }

  let adminEndpointsPromise;

  return function getAdminEndpoints() {
    if (!adminEndpointsPromise) {
      adminEndpointsPromise = createAdminEndpointsPromiseFn();
    }

    return adminEndpointsPromise;
  };
}

/**
 * Build a memoized admin endpoints getter backed by the static config loader.
 * @param {() => Promise<Record<string, string>>} loadStaticConfigFn - Loader for the static config JSON.
 * @returns {() => Promise<{
 *   triggerRenderContentsUrl: string,
 *   markVariantDirtyUrl: string,
 *   generateStatsUrl: string,
 * }>} Function returning a memoized admin endpoints promise.
 */
export function createGetAdminEndpointsFromStaticConfig(loadStaticConfigFn) {
  return createGetAdminEndpoints(() =>
    createAdminEndpointsPromise(loadStaticConfigFn)
  );
}

/**
 * Trigger the render contents endpoint using the provided dependencies.
 * @param {() => Promise<{ triggerRenderContentsUrl: string }>} getAdminEndpointsFn - Function resolving admin endpoints.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn - Fetch-like function for network calls.
 * @param {string} token - ID token attached to the Authorization header.
 * @returns {Promise<Response>} Response from the render trigger request.
 */
export async function postTriggerRenderContents(
  getAdminEndpointsFn,
  fetchFn,
  token
) {
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

  const { triggerRenderContentsUrl } = await getAdminEndpointsFn();
  return fetchFn(triggerRenderContentsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Report the outcome of a trigger render request using the provided messenger.
 * @param {Response} res - Response returned by the trigger render request.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @returns {Promise<void>}
 */
export async function announceTriggerRenderResult(res, showMessage) {
  if (!res?.ok) {
    const status = res?.status ?? 'unknown';
    const statusText = res?.statusText ?? 'unknown';
    const body = (await res?.text?.()) ?? '';
    const bodySuffix = body ? ` - ${body}` : '';

    showMessage(`Render failed: ${status} ${statusText}${bodySuffix}`);
    return;
  }

  showMessage('Render triggered');
}

/**
 * Execute the trigger render flow and report outcomes.
 * @param {() => Promise<{ triggerRenderContentsUrl: string }>} getAdminEndpointsFn - Resolves admin endpoints.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn - Fetch-like network caller.
 * @param {string} token - ID token attached to the Authorization header.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @returns {Promise<void>}
 */
export async function executeTriggerRender(
  getAdminEndpointsFn,
  fetchFn,
  token,
  showMessage
) {
  try {
    const res = await postTriggerRenderContents(getAdminEndpointsFn, fetchFn, token);
    await announceTriggerRenderResult(res, showMessage);
  } catch (e) {
    showMessage(`Render failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Create a trigger render handler with the supplied dependencies.
 * @param {{ getIdToken: () => string | null | undefined }} googleAuth - Google auth helper with a `getIdToken` accessor.
 * @param {() => Promise<{ triggerRenderContentsUrl: string }>} getAdminEndpointsFn - Resolves admin endpoints.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn - Fetch-like network caller.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @returns {() => Promise<void>} Function that triggers render when invoked.
 */
export function createTriggerRender(
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage
) {
  if (!googleAuth || typeof googleAuth.getIdToken !== 'function') {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }
  if (typeof showMessage !== 'function') {
    throw new TypeError('showMessage must be a function');
  }

  return async function triggerRender() {
    const token = googleAuth.getIdToken();
    if (!token) {
      showMessage('Render failed: missing ID token');
    } else {
      await executeTriggerRender(getAdminEndpointsFn, fetchFn, token, showMessage);
    }
  };
}

/**
 * Attach the trigger render handler to the render button when present.
 * @param {Document} doc - Document used to locate the render button.
 * @param {() => void | Promise<void>} triggerRenderFn - Handler invoked when the button is clicked.
 * @returns {HTMLElement | null} The render button when found, otherwise null.
 */
export function bindTriggerRenderClick(doc, triggerRenderFn) {
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof triggerRenderFn !== 'function') {
    throw new TypeError('triggerRenderFn must be a function');
  }

  const button = doc.getElementById('renderBtn');
  if (button?.addEventListener) {
    button.addEventListener('click', triggerRenderFn);
  }

  return button ?? null;
}

/**
 * Attach the trigger stats handler to the stats button when present.
 * @param {Document} doc - Document used to locate the stats button.
 * @param {() => void | Promise<void>} triggerStatsFn - Handler invoked when the button is clicked.
 * @returns {HTMLElement | null} The stats button when found, otherwise null.
 */
export function bindTriggerStatsClick(doc, triggerStatsFn) {
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof triggerStatsFn !== 'function') {
    throw new TypeError('triggerStatsFn must be a function');
  }

  const button = doc.getElementById('statsBtn');
  if (button?.addEventListener) {
    button.addEventListener('click', triggerStatsFn);
  }

  return button ?? null;
}

/**
 * Attach the regenerate variant handler to the form when present.
 * @param {Document} doc - Document used to locate the regenerate variant form.
 * @param {(event: Event) => void | Promise<void>} regenerateVariantFn - Handler invoked when the form is submitted.
 * @returns {HTMLElement | null} The regenerate form when found, otherwise null.
 */
export function bindRegenerateVariantSubmit(doc, regenerateVariantFn) {
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof regenerateVariantFn !== 'function') {
    throw new TypeError('regenerateVariantFn must be a function');
  }

  const form = doc.getElementById('regenForm');
  if (form?.addEventListener) {
    form.addEventListener('submit', regenerateVariantFn);
  }

  return form ?? null;
}

/**
 * Create a function that wires sign-out links to the provided sign-out handler.
 * @param {Document} doc - Document used to locate sign-out links.
 * @param {{ signOut: () => Promise<void> | void }} googleAuth - Google auth helper with a `signOut` method.
 * @returns {() => void} Function that attaches click handlers to sign-out links.
 */
export function createWireSignOut(doc, googleAuth) {
  if (!doc || typeof doc.querySelectorAll !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (!googleAuth || typeof googleAuth.signOut !== 'function') {
    throw new TypeError('googleAuth must provide a signOut function');
  }

  return function wireSignOut() {
    doc.querySelectorAll('#signoutLink').forEach(link => {
      if (link?.addEventListener) {
        link.addEventListener('click', async event => {
          event?.preventDefault?.();
          await googleAuth.signOut();
        });
      }
    });
  };
}

/**
 * Create a trigger stats handler with the supplied dependencies.
 * @param {{ getIdToken: () => string | null | undefined }} googleAuth - Google auth helper with a `getIdToken` accessor.
 * @param {() => Promise<{ generateStatsUrl: string }>} getAdminEndpointsFn - Resolves admin endpoints.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn - Fetch-like network caller.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @returns {() => Promise<void>} Function that triggers stats generation when invoked.
 */
export function createTriggerStats(
  googleAuth,
  getAdminEndpointsFn,
  fetchFn,
  showMessage
) {
  if (!googleAuth || typeof googleAuth.getIdToken !== 'function') {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }
  if (typeof showMessage !== 'function') {
    throw new TypeError('showMessage must be a function');
  }

  return async function triggerStats() {
    const token = googleAuth.getIdToken();
    if (!token) {
      showMessage('Stats generation failed');
      return;
    }

    try {
      const { generateStatsUrl } = await getAdminEndpointsFn();
      await fetchFn(generateStatsUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage('Stats generated');
    } catch {
      showMessage('Stats generation failed');
    }
  };
}

/**
 * Create a regenerate variant handler with the supplied dependencies.
 * @param {{ getIdToken: () => string | null | undefined }} googleAuth - Google auth helper with a `getIdToken` accessor.
 * @param {Document} doc - Document used to locate form inputs.
 * @param {(text: string) => void} showMessage - Callback to surface status messages.
 * @param {() => Promise<{ markVariantDirtyUrl: string }>} getAdminEndpointsFn - Resolves admin endpoints.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetchFn - Fetch-like network caller.
 * @returns {(event: Event) => Promise<void>} Function that triggers variant regeneration when invoked.
 */
export function createRegenerateVariant(
  googleAuth,
  doc,
  showMessage,
  getAdminEndpointsFn,
  fetchFn
) {
  if (!googleAuth || typeof googleAuth.getIdToken !== 'function') {
    throw new TypeError('googleAuth must provide a getIdToken function');
  }
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }
  if (typeof showMessage !== 'function') {
    throw new TypeError('showMessage must be a function');
  }
  if (typeof getAdminEndpointsFn !== 'function') {
    throw new TypeError('getAdminEndpointsFn must be a function');
  }
  if (typeof fetchFn !== 'function') {
    throw new TypeError('fetchFn must be a function');
  }

  return async function regenerateVariant(event) {
    event?.preventDefault?.();

    const token = googleAuth.getIdToken();
    if (!token) {
      return;
    }

    const input = doc.getElementById('regenInput');
    const value = input?.value?.trim?.();
    const match = value?.match?.(/^(\d+)([a-zA-Z]+)$/);

    if (!match) {
      showMessage('Invalid format');
      return;
    }

    const page = Number(match[1]);
    const variant = match[2];

    try {
      const { markVariantDirtyUrl } = await getAdminEndpointsFn();
      const res = await fetchFn(markVariantDirtyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page, variant }),
      });

      if (!res?.ok) {
        throw new Error('fail');
      }

      showMessage('Regeneration triggered');
    } catch {
      showMessage('Regeneration failed');
    }
  };
}

/**
 * Locate the status paragraph within the provided document.
 * @param {Document} doc - Document to query for the status element.
 * @returns {HTMLElement | null} Paragraph element used for status messages.
 */
export function getStatusParagraph(doc) {
  return doc.getElementById('renderStatus');
}

/**
 * Create a status message reporter bound to the provided document lookup.
 * @param {(doc: Document) => HTMLElement | null} getStatusParagraphFn - Resolves the status element.
 * @param {Document} doc - Document used to locate the status element.
 * @returns {(text: string) => void} Function that renders status messages.
 */
export function createShowMessage(getStatusParagraphFn, doc) {
  if (typeof getStatusParagraphFn !== 'function') {
    throw new TypeError('getStatusParagraphFn must be a function');
  }
  if (!doc || typeof doc.getElementById !== 'function') {
    throw new TypeError('doc must be a Document-like object');
  }

  const statusParagraph = getStatusParagraphFn(doc);

  return function showMessage(text) {
    if (!statusParagraph) {
      return;
    }

    statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
  };
}

/**
 * Locate the main admin content container within the provided document.
 * @param {Document} doc - Document to query for the content element.
 * @returns {HTMLElement | null} Element containing admin controls when present.
 */
export function getAdminContent(doc) {
  return doc.getElementById('adminContent');
}

/**
 * Locate all sign-in button elements within the provided document.
 * @param {Document} doc - Document to query for sign-in controls.
 * @returns {NodeListOf<HTMLElement>} Elements that trigger the sign-in flow.
 */
export function getSignInButtons(doc) {
  return doc.querySelectorAll('#signinButton');
}

/**
 * Locate all sign-out container elements within the provided document.
 * @param {Document} doc - Document to query for sign-out controls.
 * @returns {NodeListOf<HTMLElement>} Elements that wrap sign-out actions.
 */
export function getSignOutSections(doc) {
  return doc.querySelectorAll('#signoutWrap');
}

/**
 * Safely access the current authenticated user.
 * @param {() => { currentUser: unknown } | null | undefined} getAuthFn - Getter for the auth instance.
 * @returns {unknown | null} Current user when available.
 */
export function getCurrentUser(getAuthFn) {
  if (typeof getAuthFn !== 'function') {
    return null;
  }

  const auth = getAuthFn();
  return auth?.currentUser ?? null;
}

/**
 * Update the display state of sign-in and sign-out controls based on the user.
 * @param {{ uid?: string } | null | undefined} user - Current authenticated user.
 * @param {NodeListOf<HTMLElement>} signIns - Elements that trigger sign-in.
 * @param {NodeListOf<HTMLElement>} signOuts - Elements that trigger sign-out.
 */
export function updateAuthControlsDisplay(user, signIns, signOuts) {
  const isSignedIn = Boolean(user);

  signIns.forEach(element => {
    element.style.display = isSignedIn ? 'none' : '';
  });

  signOuts.forEach(element => {
    element.style.display = isSignedIn ? '' : 'none';
  });
}

/**
 * Build a check access handler tied to the provided auth getter and document.
 * @param {() => { currentUser?: { uid?: string } } | null | undefined} getAuthFn - Getter for the auth instance.
 * @param {Document} doc - Document used to resolve admin controls.
 * @returns {() => void} Function that evaluates the current access state.
 */
export function createCheckAccess(getAuthFn, doc) {
  return function checkAccess() {
    const user = getCurrentUser(getAuthFn);
    const content = getAdminContent(doc);
    const signins = getSignInButtons(doc);
    const signouts = getSignOutSections(doc);

    updateAuthControlsDisplay(user, signins, signouts);

    if (!user || user.uid !== ADMIN_UID) {
      if (content) content.style.display = 'none';
      return;
    }

    if (content) content.style.display = '';
  };
}
