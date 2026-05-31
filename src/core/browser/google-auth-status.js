/**
 * Create a handle that wires Google auth status controls.
 * @param {{
 *   documentObj: Document,
 *   initGoogleSignInFn: (options: {onSignIn: () => void}) => void,
 *   signOutFn: () => Promise<unknown>,
 *   getIdTokenFn: () => string | null,
 *   isAdminFn: () => boolean,
 * }} deps Browser auth status dependencies.
 * @returns {() => void} Google auth status setup handle.
 */
export function createGoogleAuthStatusHandle({
  documentObj,
  initGoogleSignInFn,
  signOutFn,
  getIdTokenFn,
  isAdminFn,
}) {
  return function handleGoogleAuthStatus() {
    const signInButtons =
      /** @type {NodeListOf<HTMLElement>} */ (
        documentObj.querySelectorAll('#signinButton')
      );
    const signOutWraps =
      /** @type {NodeListOf<HTMLElement>} */ (
        documentObj.querySelectorAll('#signoutWrap')
      );
    const signOutLinks =
      /** @type {NodeListOf<HTMLAnchorElement>} */ (
        documentObj.querySelectorAll('#signoutLink')
      );
    const adminLinks =
      /** @type {NodeListOf<HTMLElement>} */ (
        documentObj.querySelectorAll('.admin-link')
      );

    const showSignedIn = createShowSignedIn({
      signInButtons,
      signOutWraps,
      adminLinks,
      isAdminFn,
    });
    const showSignedOut = createShowSignedOut({
      signInButtons,
      signOutWraps,
      adminLinks,
    });

    initGoogleSignInFn({ onSignIn: showSignedIn });
    signOutLinks.forEach(link => {
      link.addEventListener('click', async event => {
        event.preventDefault();
        await signOutFn();
        showSignedOut();
      });
    });

    if (getIdTokenFn()) {
      showSignedIn();
    }
  };
}

/**
 * Create the signed-in display action.
 * @param {{
 *   signInButtons: NodeListOf<HTMLElement>,
 *   signOutWraps: NodeListOf<HTMLElement>,
 *   adminLinks: NodeListOf<HTMLElement>,
 *   isAdminFn: () => boolean,
 * }} deps Display dependencies.
 * @returns {() => void} Signed-in display action.
 */
function createShowSignedIn({
  signInButtons,
  signOutWraps,
  adminLinks,
  isAdminFn,
}) {
  return function showSignedIn() {
    signInButtons.forEach(element => {
      element.style.display = 'none';
    });
    signOutWraps.forEach(element => {
      element.style.display = '';
    });
    if (isAdminFn()) {
      adminLinks.forEach(element => {
        element.style.display = '';
      });
    }
  };
}

/**
 * Create the signed-out display action.
 * @param {{
 *   signInButtons: NodeListOf<HTMLElement>,
 *   signOutWraps: NodeListOf<HTMLElement>,
 *   adminLinks: NodeListOf<HTMLElement>,
 * }} deps Display dependencies.
 * @returns {() => void} Signed-out display action.
 */
function createShowSignedOut({ signInButtons, signOutWraps, adminLinks }) {
  return function showSignedOut() {
    signInButtons.forEach(element => {
      element.style.display = '';
    });
    signOutWraps.forEach(element => {
      element.style.display = 'none';
    });
    adminLinks.forEach(element => {
      element.style.display = 'none';
    });
  };
}
