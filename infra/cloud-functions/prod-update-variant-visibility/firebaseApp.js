import { initializeApp } from 'firebase-admin/app';

let firebaseInitialized = false;

/**
 * Ensure the default Firebase Admin app is initialized.
 * @param {() => void} [initFn] Optional initializer for dependency injection.
 */
export function ensureFirebaseApp(initFn = initializeApp) {
  if (firebaseInitialized) {
    return;
  }

  try {
    initFn();
  } catch (error) {
    const duplicateApp =
      error &&
      (error.code === 'app/duplicate-app' ||
        typeof error.message === 'string') &&
      String(error.message).toLowerCase().includes('already exists');

    if (!duplicateApp) {
      throw error;
    }
  }

  firebaseInitialized = true;
}

/**
 * Reset the initialization flag. Primarily used in tests.
 */
export function resetFirebaseInitializationState() {
  firebaseInitialized = false;
}
