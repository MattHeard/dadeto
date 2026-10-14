/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{startAfter: (cursor: unknown) => ProjectionQuery, get: () => Promise<{empty: boolean, docs: Array<{id: string}>}>}} ProjectionQuery */

/**
 * Refresh every assignment projection in document-ID pages.
 * @param {AllowEffects} allowEffects Permission for Firestore access.
 * @param {{db: {collection: (name: string) => {orderBy: (field: unknown) => {limit: (size: number) => ProjectionQuery}}}, repository: {refresh: (permission: AllowEffects, options: {assignmentId: string}) => Promise<void>}, documentIdFieldPath: unknown, pageSize?: number}} options Firestore and projection dependencies.
 * @returns {Promise<number>} Number of assignment documents processed.
 */
export async function backfillRunnerCommitmentProjections(
  allowEffects,
  { db, repository, documentIdFieldPath, pageSize = 100 }
) {
  let cursor;
  let processed = 0;
  for (;;) {
    let query = db
      .collection('runner_assignments')
      .orderBy(documentIdFieldPath)
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) return processed;
    for (const assignment of page.docs) {
      await repository.refresh(allowEffects, { assignmentId: assignment.id });
      processed += 1;
    }
    cursor = page.docs.at(-1);
  }
}
