import { initializeApp } from 'firebase-admin/app';

/**
 * Determine whether an initialization error indicates a duplicate Firebase app.
 * @param {unknown} error Error thrown during Firebase initialization.
 * @returns {boolean} True when the error corresponds to an already-initialized app.
 */
function isDuplicateFirebaseAppError(error) {
  if (!error) {
    return false;
  }

  const candidate = /** @type {{ code?: string, message?: unknown }} */ (error);
  const hasDuplicateCode = candidate.code === 'app/duplicate-app';
  const hasStringMessage = typeof candidate.message === 'string';
  const messageText = String(candidate.message ?? '').toLowerCase();

  return messageText.includes('already exists') && (hasDuplicateCode || hasStringMessage);
}

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
   * Ensure the default Firebase Admin app is initialized.
   * @param {() => void} [initFn] Optional initializer for dependency injection.
   * @returns {void}
   */
  function ensureFirebaseApp(initFn = initializer) {
    if (state.firebaseInitialized) {
      return;
    }

    try {
      initFn();
    } catch (error) {
      if (!isDuplicateFirebaseAppError(error)) {
        throw error;
      }
    }

    state.firebaseInitialized = true;
  }

  /**
   * Reset the initialization flag. Primarily used in tests.
   * @returns {void}
   */
  function resetFirebaseInitializationState() {
    state.firebaseInitialized = false;
  }

  return { ensureFirebaseApp, resetFirebaseInitializationState };
}

export const {
  ensureFirebaseApp,
  resetFirebaseInitializationState,
} = createFirebaseAppManager(initializeApp);
