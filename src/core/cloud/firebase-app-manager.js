import { ensureFirebaseAppOnce } from './cloud-core.js';

/**
 * Create helpers that manage Firebase Admin app initialization state.
 * @param {() => void} initializer Firebase initialization function.
 * @returns {{
 *   ensureFirebaseApp: (initFn?: () => void) => void,
 *   resetFirebaseInitializationState: () => void,
 * }} Firebase initialization helpers.
 */
export function createFirebaseAppManager(initializer) {
  const state = { firebaseInitialized: false };

  /**
   * Initialize the Firebase app once, tolerating duplicate-app errors.
   * @param {(() => void) | undefined} [initFn] Initialization function invoked if the app is not yet ready.
   * @returns {void}
   */
  function ensureFirebaseApp(initFn) {
    ensureFirebaseAppState(state, initFn ?? initializer);
  }

  /**
   * Reset the Firebase initialization flag.
   * @returns {void}
   */
  function resetFirebaseInitializationState() {
    state.firebaseInitialized = false;
  }

  return { ensureFirebaseApp, resetFirebaseInitializationState };
}

/**
 * Create initialized Firebase-backed cloud app dependencies.
 * @param {{
 *   initializeApp: () => void,
 *   createFirebaseAppManager: (initializer: () => void) => { ensureFirebaseApp: (initFn?: () => void) => void },
 *   getEnvironmentVariables: () => Record<string, string | undefined>,
 *   getFirestoreInstance: (options: { environment: Record<string, string | undefined> }) => unknown,
 *   getAuth: () => unknown,
 *   express: () => unknown,
 * }} deps Cloud wiring dependencies.
 * @returns {{ db: unknown, auth: unknown, app: unknown }} Initialized cloud app parts.
 */
export function createFirebaseAppContext(deps) {
  const { ensureFirebaseApp } = deps.createFirebaseAppManager(
    deps.initializeApp
  );

  ensureFirebaseApp();
  const environmentVariables = deps.getEnvironmentVariables();

  return {
    db: deps.getFirestoreInstance({ environment: environmentVariables }),
    auth: deps.getAuth(),
    app: deps.express(),
  };
}

/**
 * Determine whether Firebase has already been initialized.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @returns {boolean} True when initialization should be skipped.
 */
function firebaseAlreadyInitialized(state) {
  return state.firebaseInitialized;
}

/**
 * Ensure the Firebase app is initialized for the current state.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @param {() => void} initFn Initialization function.
 * @returns {void} Nothing.
 */
function ensureFirebaseAppState(state, initFn) {
  if (firebaseAlreadyInitialized(state)) {
    return;
  }

  ensureFirebaseAppOnce(initFn);
  markFirebaseInitialized(state);
}

/**
 * Mark the Firebase initialization as complete.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @returns {void} Nothing.
 */
function markFirebaseInitialized(state) {
  state.firebaseInitialized = true;
}
