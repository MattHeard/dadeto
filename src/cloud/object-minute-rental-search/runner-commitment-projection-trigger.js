/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
import { findAffectedRunnerAssignments } from './runner-commitment-projection-source-queries.js';

const SOURCE_EVENT_CONFIG = {
  assignment: { idParameter: 'assignmentId' },
  segment: { idParameter: 'segmentId' },
  point: { idParameter: 'pointId' },
};

/**
 * Create a handler that refreshes all assignment projections affected by a
 * write to one canonical source collection.
 * @param {{db: {collection: (name: string) => {where: (field: string, operator: string, value: string|string[]) => {get: () => Promise<{docs?: Array<{id: string}>}>}}}, repository: {refresh: (allowEffects: AllowEffects, options: {assignmentId: string}) => Promise<void>}, sourceType: keyof typeof SOURCE_EVENT_CONFIG}} options Trigger dependencies.
 * @returns {(allowEffects: AllowEffects, change: unknown, context: {params: Record<string, string>}) => Promise<void>} Projection trigger handler.
 */
export function createRunnerCommitmentProjectionTriggerHandler({
  db,
  repository,
  sourceType,
}) {
  if (!Object.hasOwn(SOURCE_EVENT_CONFIG, sourceType)) {
    throw new Error('invalid-projection-source-type');
  }
  return async (allowEffects, _change, context) => {
    const sourceId = context.params[SOURCE_EVENT_CONFIG[sourceType].idParameter];
    if (!usableId(sourceId)) throw new Error('invalid-projection-source-id');
    const assignmentIds = await findAffectedRunnerAssignments(
      db,
      sourceType,
      sourceId
    );
    await Promise.all(
      assignmentIds.map(assignmentId =>
        repository.refresh(allowEffects, { assignmentId })
      )
    );
  };
}

function usableId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
