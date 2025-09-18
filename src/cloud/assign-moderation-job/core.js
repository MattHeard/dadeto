/**
 * Determine whether a request origin is allowed.
 * @param {string | undefined} origin Request origin header.
 * @param {string[]} allowedOrigins Whitelisted origins.
 * @returns {boolean} True when the origin should be allowed.
 */
export function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

/**
 * Initialize Firebase resources, configure CORS, and expose dependencies.
 * @param {() => { db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} initializeFirebaseApp
 * Function that initializes Firebase and returns dependencies.
 * @param {(appInstance: import('express').Express, allowedOrigins: string[]) => void} configureCors
 * Function that configures CORS for the Express app.
 * @param {string[]} allowedOrigins Origins permitted to access the endpoint.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} Initialized dependencies.
 */
export function createAssignModerationApp(
  initializeFirebaseApp,
  configureCors,
  allowedOrigins
) {
  const { db, auth, app } = initializeFirebaseApp();
  configureCors(app, allowedOrigins);

  return { db, auth, app };
}
