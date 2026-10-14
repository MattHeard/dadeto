import functions from 'firebase-functions/v1';
import {
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import { ensureFirebaseApp } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createRunnerCommitmentProjectionRepository } from './runner-commitment-projection-repository.js';
import { registerRunnerCommitmentProjectionTriggers } from './runner-commitment-projection-trigger-adapter.js';
import { createRunnerCommitmentProjectionTriggerHandler } from './runner-commitment-projection-trigger.js';

const environment = process.env;
const sourceTypes = /** @type {Array<'assignment'|'segment'|'point'>} */ ([
  'assignment',
  'segment',
  'point',
]);
const projectionTriggers = createEffectStartupBoundary(allowEffects => {
  const handlers = Object.fromEntries(
    sourceTypes.map(sourceType => [
      sourceType,
      createEffectInvocationBoundary(async (permission, change, context) => {
        ensureFirebaseApp(permission);
        const db = getFirestoreInstance(permission, { ensureAppFn: () => {} });
        const repository = createRunnerCommitmentProjectionRepository({ db });
        return createRunnerCommitmentProjectionTriggerHandler({
          db,
          repository,
          sourceType,
        })(permission, change, context);
      }),
    ])
  );
  return registerRunnerCommitmentProjectionTriggers(allowEffects, functions, {
    region: environment.FUNCTION_REGION ?? 'europe-west3',
    database: environment.DATABASE_ID ?? '(default)',
    handlers,
  });
});

export const refreshRunnerCommitmentOnAssignment = projectionTriggers.assignment;
export const refreshRunnerCommitmentOnSegment = projectionTriggers.segment;
export const refreshRunnerCommitmentOnPoint = projectionTriggers.point;
