/** @param {{collection: (name: string) => {doc: (id: string) => unknown}, getAll: (...references: unknown[]) => Promise<Array<{id: string, data: () => unknown}>>}} db Firestore dependency. @param {Array<{segmentId?: unknown}>} assignments Matching assignments. @returns {Promise<{segments: Map<string, unknown>, points: Map<string, unknown>}>} Batched record indexes. */
export async function batchCommitmentRecords(db, assignments) {
  const read = (collection, ids) =>
    ids.length ? db.getAll(...ids.map(id => db.collection(collection).doc(id))) : [];
  const ids = values => [...new Set(values.filter(value => typeof value === 'string' && value.trim()))];
  const segmentIds = ids(assignments.map(assignment => assignment?.segmentId));
  const segmentDocs = await read('segments', segmentIds);
  const segments = new Map(segmentDocs.map(document => [document.id, document.data()]));
  const pointIds = ids([...segments.values()].flatMap(segment => [
    segment?.startPointId,
    segment?.endPointId,
  ]));
  const pointDocs = await read('spacetime_points', pointIds);
  return {
    segments,
    points: new Map(pointDocs.map(document => [document.id, document.data()])),
  };
}
