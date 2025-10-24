let resetHandler = () => {};

/**
 * Register handlers that manage Firebase Admin app initialization state.
 * @param {{ reset?: () => void }} handlers Callback implementations.
 */
export function registerFirebaseInitializationHandlers(handlers = {}) {
  if (typeof handlers.reset === 'function') {
    resetHandler = handlers.reset;
  }
}

/**
 * Reset the initialization flag. Primarily used in tests.
 */
export function resetFirebaseInitializationState() {
  resetHandler();
}
