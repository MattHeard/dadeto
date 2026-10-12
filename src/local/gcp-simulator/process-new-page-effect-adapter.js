/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{batch: () => {set: (reference: object, data: object) => unknown, update: (reference: object, data: object) => unknown, commit: () => Promise<unknown>}}} db @returns {object} */
export function createSubmissionBatch(permission, db) {
  void permission;
  const batch = db.batch();
  return {
    set: (reference, data) => batch.set(reference, data),
    update: (reference, data) => batch.update(reference, data),
    commit: () => batch.commit(),
  };
}
