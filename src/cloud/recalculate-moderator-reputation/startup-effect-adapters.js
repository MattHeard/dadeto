/** @typedef {import('../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Initialize Firebase Admin inside the invocation's permission boundary.
 * @param {AllowEffects} allowEffects Invocation permission.
 * @param {(allowEffects: AllowEffects) => void} ensureFirebaseApp Firebase initialization manager.
 * @returns {void}
 */
export function initializeModeratorReputationFirebase(
  allowEffects,
  ensureFirebaseApp
) {
  ensureFirebaseApp(allowEffects);
}

/**
 * Register the daily moderator reputation recomputation schedule.
 * @param {AllowEffects} allowEffects Startup permission.
 * @param {{ region: (name: string) => { pubsub: { schedule: (interval: string) => { onRun: (handler: () => Promise<null>) => unknown } } }} functions Firebase Functions module.
 * @param {() => Promise<null>} handler Scheduled invocation handler.
 * @returns {unknown} Registered scheduled function.
 */
export function registerModeratorReputationSchedule(
  allowEffects,
  functions,
  handler
) {
  void allowEffects;
  return functions
    .region('europe-west1')
    .pubsub.schedule('every 24 hours')
    .onRun(handler);
}
