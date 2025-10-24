let firebaseInitialized = false;

/**
 * Determine whether the Firebase Admin app has already been initialized.
 * @returns {boolean} True when the shared Firebase app is ready.
 */
export function hasFirebaseBeenInitialized() {
  return firebaseInitialized;
}

/**
 * Mark the Firebase Admin app as initialized.
 */
export function markFirebaseInitialized() {
  firebaseInitialized = true;
}

/**
 * Reset the initialization flag. Primarily used in tests.
 */
export function resetFirebaseInitializationState() {
  firebaseInitialized = false;
}
