/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

const SOURCE_DOCUMENTS = {
  assignment: 'runner_assignments/{assignmentId}',
  segment: 'segments/{segmentId}',
  point: 'spacetime_points/{pointId}',
};

/**
 * Register write triggers for every source collection that can affect the projection.
 * @param {AllowEffects} allowEffects Permission to register Cloud Functions.
 * @param {{region: (name: string) => {firestore: {document: (path: string) => {onWrite: (handler: (...args: any[]) => unknown) => unknown}, database?: (name: string) => {document: (path: string) => {onWrite: (handler: (...args: any[]) => unknown) => unknown}}}}} functions Cloud Functions registry.
 * @param {{region: string, database: string, handlers: Record<keyof typeof SOURCE_DOCUMENTS, (...args: any[]) => unknown>}} options Trigger configuration and handlers.
 * @returns {Record<keyof typeof SOURCE_DOCUMENTS, unknown>} Registered trigger functions.
 */
export function registerRunnerCommitmentProjectionTriggers(
  allowEffects,
  functions,
  { region, database, handlers }
) {
  void allowEffects;
  const regionalFunctions = functions.region(region);
  if (
    database &&
    database !== '(default)' &&
    !regionalFunctions.firestore.database
  ) {
    throw new Error('named-firestore-database-triggers-unsupported');
  }
  const firestore = database && database !== '(default)'
    ? regionalFunctions.firestore.database(database)
    : regionalFunctions.firestore;
  return Object.fromEntries(
    Object.entries(SOURCE_DOCUMENTS).map(([sourceType, documentPath]) => [
      sourceType,
      firestore.document(documentPath).onWrite(handlers[sourceType]),
    ])
  );
}
