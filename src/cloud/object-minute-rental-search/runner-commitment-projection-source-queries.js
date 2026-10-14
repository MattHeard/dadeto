const MAX_IN_VALUES = 30;

/**
 * Find assignments affected by a write to an assignment, segment, or point.
 * @param {{collection: (name: string) => {where: (field: string, operator: string, value: string|string[]) => {get: () => Promise<{docs?: Array<{id: string}>}>}}} db Firestore query dependency.
 * @param {'assignment'|'segment'|'point'} sourceType Changed source collection.
 * @param {string} sourceId Changed document ID.
 * @returns {Promise<string[]>} Affected assignment document IDs.
 */
export async function findAffectedRunnerAssignments(db, sourceType, sourceId) {
  if (sourceType === 'assignment') return [sourceId];
  if (sourceType === 'segment') {
    return assignmentIdsForSegments(db, [sourceId]);
  }
  const [startSegments, endSegments] = await Promise.all([
    db.collection('segments').where('startPointId', '==', sourceId).get(),
    db.collection('segments').where('endPointId', '==', sourceId).get(),
  ]);
  const segmentIds = [
    ...new Set(
      [...(startSegments.docs ?? []), ...(endSegments.docs ?? [])].map(
        document => document.id
      )
    ),
  ];
  return assignmentIdsForSegments(db, segmentIds);
}

/** @param {Parameters<typeof findAffectedRunnerAssignments>[0]} db Firestore query dependency. @param {string[]} segmentIds Segment document IDs. @returns {Promise<string[]>} Matching assignment document IDs. */
async function assignmentIdsForSegments(db, segmentIds) {
  const groups = [];
  for (let index = 0; index < segmentIds.length; index += MAX_IN_VALUES) {
    groups.push(segmentIds.slice(index, index + MAX_IN_VALUES));
  }
  const snapshots = await Promise.all(
    groups.map(ids =>
      db.collection('runner_assignments').where('segmentId', 'in', ids).get()
    )
  );
  return [
    ...new Set(
      snapshots.flatMap(snapshot =>
        (snapshot.docs ?? []).map(document => document.id)
      )
    ),
  ];
}
