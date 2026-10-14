/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/** @param {AllowEffects} allowEffects Permission for Firebase startup. @param {(allowEffects: AllowEffects) => import('firebase-admin/firestore').Firestore} getFirestoreInstance Firestore resolver. @returns {import('firebase-admin/firestore').Firestore} Startup Firestore client. */
export function getProcessNewPageStartupFirestore(allowEffects, getFirestoreInstance) {
  return getFirestoreInstance(allowEffects);
}
