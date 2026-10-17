/**
 * Create a handle that wires Google auth status controls.
 * @param {Document | LegacyGoogleAuthStatusOptions} documentOrOptions DOM or the legacy options object.
 * @param {GoogleAuthStatusActions} [authActions] Sign-in and session actions for the positional call shape.
 * @param {GoogleAuthStatusIdentity} [identity] Current-user accessors for the positional call shape.
 * @returns {() => void} Google auth status setup handle.
 */
export function createGoogleAuthStatusHandle(
  documentOrOptions,
  authActions,
  identity
) {
  const dependencies = normalizeDependencies(
    documentOrOptions,
    authActions,
    identity
  );
  return function handleGoogleAuthStatus() {
    if (typeof dependencies.documentObj?.querySelectorAll !== 'function') {
      return;
    }
    const { documentObj, authActions, identity } = dependencies;
    const signInButtons = /** @type {HTMLElement[]} */ (
      Array.from(documentObj.querySelectorAll('#signinButton'))
    );
    const signOutWraps = /** @type {HTMLElement[]} */ (
      Array.from(documentObj.querySelectorAll('#signoutWrap'))
    );
    const profileLinks = /** @type {HTMLAnchorElement[]} */ (
      Array.from(documentObj.querySelectorAll('#profileLink'))
    );
    const signOutLinks = /** @type {HTMLAnchorElement[]} */ (
      Array.from(documentObj.querySelectorAll('#signoutLink'))
    );
    const adminLinks = /** @type {HTMLElement[]} */ (
      Array.from(documentObj.querySelectorAll('.admin-link'))
    );

    const displayElements = {
      signInButtons,
      signOutWraps,
      profileLinks,
      adminLinks,
    };
    const showSignedIn = createShowSignedIn(displayElements, {
      getAuthorUuidFn: identity.getAuthorUuidFn,
      isAdminFn: identity.isAdminFn,
    });
    const showSignedOut = createShowSignedOut(displayElements);

    authActions.initGoogleSignInFn({ onSignIn: showSignedIn });
    signOutLinks.forEach(link => {
      link.addEventListener('click', async event => {
        event.preventDefault();
        await authActions.signOutFn();
        showSignedOut();
      });
    });

    if (identity.getIdTokenFn()) {
      showSignedIn();
      Promise.resolve(authActions.refreshAuthorUuidFn?.()).then(() =>
        showSignedIn()
      );
    }
  };
}

/**
 * Normalize legacy options and current positional calls.
 * @param {unknown} documentOrOptions DOM or the legacy options object.
 * @param {GoogleAuthStatusActions | undefined} authActions Positional sign-in and session actions.
 * @param {GoogleAuthStatusIdentity | undefined} identity Positional current-user accessors.
 * @returns {GoogleAuthStatusDependencies} Normalized dependencies.
 */
function normalizeDependencies(documentOrOptions, authActions, identity) {
  if (authActions !== undefined || identity !== undefined) {
    return {
      documentObj: /** @type {Document | undefined} */ (documentOrOptions),
      authActions: /** @type {GoogleAuthStatusActions} */ (authActions ?? {}),
      identity: /** @type {GoogleAuthStatusIdentity} */ (identity ?? {}),
    };
  }

  const options = /** @type {LegacyGoogleAuthStatusOptions} */ (
    documentOrOptions ?? {}
  );
  return {
    documentObj: options.documentObj,
    authActions: {
      initGoogleSignInFn: options.initGoogleSignInFn,
      refreshAuthorUuidFn: options.refreshAuthorUuidFn,
      signOutFn: options.signOutFn,
    },
    identity: {
      getAuthorUuidFn: options.getAuthorUuidFn,
      getIdTokenFn: options.getIdTokenFn,
      isAdminFn: options.isAdminFn,
    },
  };
}

/** @typedef {{initGoogleSignInFn: (options: {onSignIn: () => void}) => void, refreshAuthorUuidFn?: () => string | null | Promise<string | null>, signOutFn: () => Promise<unknown>}} GoogleAuthStatusActions */
/** @typedef {{getAuthorUuidFn: () => string | null, getIdTokenFn: () => string | null, isAdminFn: () => boolean}} GoogleAuthStatusIdentity */
/** @typedef {{documentObj?: Document, initGoogleSignInFn: (options: {onSignIn: () => void}) => void, getAuthorUuidFn: () => string | null, refreshAuthorUuidFn?: () => string | null | Promise<string | null>, signOutFn: () => Promise<unknown>, getIdTokenFn: () => string | null, isAdminFn: () => boolean}} LegacyGoogleAuthStatusOptions */
/** @typedef {{documentObj: Document | undefined, authActions: GoogleAuthStatusActions, identity: GoogleAuthStatusIdentity}} GoogleAuthStatusDependencies */

/**
 * Create the signed-in display action.
 * @param {{ signInButtons: HTMLElement[], signOutWraps: HTMLElement[], profileLinks: HTMLAnchorElement[], adminLinks: HTMLElement[] }} displayElements Auth-related elements.
 * @param {{ getAuthorUuidFn: () => string | null, isAdminFn: () => boolean }} identity Accessors for the active user.
 * @returns {() => void} Signed-in display action.
 */
function createShowSignedIn(displayElements, identity) {
  return function showSignedIn() {
    setElementsDisplay(displayElements.signInButtons, 'none');
    setElementsDisplay(displayElements.signOutWraps, '');
    const authorUuid = identity.getAuthorUuidFn();
    setProfileLinks(displayElements.profileLinks, authorUuid);
    if (identity.isAdminFn()) {
      setElementsDisplay(displayElements.adminLinks, '');
    }
  };
}

/**
 * Create the signed-out display action.
 * @param {{
 *   signInButtons: HTMLElement[],
 *   signOutWraps: HTMLElement[],
 *   profileLinks: HTMLAnchorElement[],
 *   adminLinks: HTMLElement[],
 * }} deps Display dependencies.
 * @returns {() => void} Signed-out display action.
 */
function createShowSignedOut(deps) {
  return function showSignedOut() {
    setElementsDisplay(deps.signInButtons, '');
    setElementsDisplay(deps.signOutWraps, 'none');
    setProfileLinks(deps.profileLinks, null);
    setElementsDisplay(deps.adminLinks, 'none');
  };
}

/**
 * Set the display style for a group of elements.
 * @param {HTMLElement[]} elements Elements to update.
 * @param {string} display CSS display value.
 * @returns {void}
 */
function setElementsDisplay(elements, display) {
  elements.forEach(element => {
    element.style.display = display;
  });
}

/**
 * Toggle profile links based on the cached author UUID.
 * @param {HTMLAnchorElement[]} links Profile link elements.
 * @param {string | null} authorUuid Cached author UUID.
 * @returns {void}
 */
function setProfileLinks(links, authorUuid) {
  links.forEach(link => {
    if (authorUuid) {
      link.href = `/a/${authorUuid}.html`;
      link.style.display = '';
      return;
    }

    link.href = '#';
    link.style.display = 'none';
  });
}
