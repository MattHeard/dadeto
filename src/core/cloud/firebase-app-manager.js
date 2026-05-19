import { isDuplicateAppError } from './cloud-core.js';

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
   * @param {() => void} initFn Initialization function invoked if the app is not yet ready.
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

  initializeFirebaseApp(initFn);
  markFirebaseInitialized(state);
}

/**
 * Run the Firebase initializer, tolerating duplicate-app errors.
 * @param {() => void} initFn Initialization function.
 * @returns {void} Nothing.
 */
function initializeFirebaseApp(initFn) {
  try {
    initFn();
  } catch (error) {
    rethrowUnlessDuplicateAppError(error);
  }
}

/**
 * Rethrow initialization errors unless they are duplicate-app errors.
 * @param {unknown} error Initialization error.
 * @returns {void} Nothing.
 */
function rethrowUnlessDuplicateAppError(error) {
  if (!isDuplicateAppError(error)) {
    throw error;
  }
}

/**
 * Mark the Firebase initialization as complete.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @returns {void} Nothing.
 */
function markFirebaseInitialized(state) {
  state.firebaseInitialized = true;
}
