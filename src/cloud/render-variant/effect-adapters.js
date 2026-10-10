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
