/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Update a variant reference through the permission-aware command boundary.
 * @param {AllowEffects} allowEffects Request capability.
 * @param {{ update: (data: Record<string, unknown>) => Promise<unknown> }} reference Firestore document reference.
 * @param {Record<string, unknown>} data Update payload.
 * @returns {Promise<unknown>} Firestore update result.
 */
export async function updateVariantDocument(allowEffects, reference, data) {
  void allowEffects;
  return reference.update(data);
}

/**
 * Save an object through the permission-aware Storage command boundary.
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
