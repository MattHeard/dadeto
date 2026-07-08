/**
 * Create a handle that wires Google auth status controls.
 * @param {{
 *   documentObj: Document,
 *   initGoogleSignInFn: (options: {onSignIn: () => void}) => void,
 *   getAuthorUuidFn: () => string | null,
 *   signOutFn: () => Promise<unknown>,
 *   getIdTokenFn: () => string | null,
 *   isAdminFn: () => boolean,
 * }} deps Browser auth status dependencies.
 * @returns {() => void} Google auth status setup handle.
 */
export function createGoogleAuthStatusHandle({
  documentObj,
  initGoogleSignInFn,
  getAuthorUuidFn,
  signOutFn,
  getIdTokenFn,
  isAdminFn,
}) {
  return function handleGoogleAuthStatus() {
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

    const showSignedIn = createShowSignedIn({
      signInButtons,
      signOutWraps,
      profileLinks,
      adminLinks,
      getAuthorUuidFn,
      isAdminFn,
    });
    const showSignedOut = createShowSignedOut({
      signInButtons,
      signOutWraps,
      profileLinks,
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
 *   signInButtons: HTMLElement[],
 *   signOutWraps: HTMLElement[],
 *   profileLinks: HTMLAnchorElement[],
 *   adminLinks: HTMLElement[],
 *   getAuthorUuidFn: () => string | null,
 *   isAdminFn: () => boolean,
 * }} deps Display dependencies.
 * @returns {() => void} Signed-in display action.
 */
function createShowSignedIn({
  signInButtons,
  signOutWraps,
  profileLinks,
  adminLinks,
  getAuthorUuidFn,
  isAdminFn,
}) {
  return function showSignedIn() {
    setElementsDisplay(signInButtons, 'none');
    setElementsDisplay(signOutWraps, '');
    const authorUuid = getAuthorUuidFn();
    setProfileLinks(profileLinks, authorUuid);
    if (isAdminFn()) {
      setElementsDisplay(adminLinks, '');
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
function createShowSignedOut({
  signInButtons,
  signOutWraps,
  profileLinks,
  adminLinks,
}) {
  return function showSignedOut() {
    setElementsDisplay(signInButtons, '');
    setElementsDisplay(signOutWraps, 'none');
    setProfileLinks(profileLinks, null);
    setElementsDisplay(adminLinks, 'none');
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
