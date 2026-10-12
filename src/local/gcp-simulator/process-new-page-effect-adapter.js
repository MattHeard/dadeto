/** @param {{batch: () => {set: (reference: object, data: object) => unknown, update: (reference: object, data: object) => unknown, commit: () => Promise<unknown>}}} db @returns {object} */
export function createSubmissionBatch(db) {
  const batch = db.batch();
  return {
    set: (permission, reference, data) => {
      void permission;
      return batch.set(reference, data);
    },
    update: (permission, reference, data) => {
      void permission;
      return batch.update(reference, data);
    },
    commit: permission => {
      void permission;
      return batch.commit();
    },
  };
}
