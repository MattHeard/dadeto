/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Save a simulator Storage file through the local effects boundary.
 * @param {AllowEffects} allowEffects Request capability.
 * @param {object} file Storage file handle.
 * @param {string} contents File contents.
 * @param {object} options Storage save options.
 * @returns {Promise<unknown>} Storage save result.
 */
export function saveStorageFile(allowEffects, file, contents, options) {
  void allowEffects;
  return /** @type {{ save: (contents: string, options: object) => Promise<unknown> }} */ (
    file
  ).save(contents, options);
}

/**
 * Update a simulator Firestore document through the local effects boundary.
 * @param {AllowEffects} allowEffects Request capability.
 * @param {{ update: (data: Record<string, unknown>) => Promise<unknown> }} reference Firestore document reference.
 * @param {Record<string, unknown>} data Update payload.
 * @returns {Promise<unknown>} Firestore update result.
 */
export function updateFirestoreDocument(allowEffects, reference, data) {
  void allowEffects;
  return reference.update(data);
}

/**
 * Set a simulator Firestore document through the local effects boundary.
 * @param {AllowEffects} allowEffects Request capability.
 * @param {{ set: (data: Record<string, unknown>) => Promise<unknown> }} reference Firestore document reference.
 * @param {Record<string, unknown>} data Document payload.
 * @returns {Promise<unknown>} Firestore set result.
 */
export function setFirestoreDocument(allowEffects, reference, data) {
  void allowEffects;
  return reference.set(data);
}

/** Register simulator middleware at its local runtime boundary. */
export function useMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}
