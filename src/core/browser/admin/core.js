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
 * Locate the status paragraph within the provided document.
 * @param {Document} doc - Document to query for the status element.
 * @returns {HTMLElement | null} Paragraph element used for status messages.
 */
export function getStatusParagraph(doc) {
  return doc.getElementById('renderStatus');
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
