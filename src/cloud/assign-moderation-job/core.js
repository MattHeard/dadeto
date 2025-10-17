import {
  createAssignModerationApp,
  createCorsOriginHandler,
  createCorsOptions,
  createSetupCors,
  createConfiguredSetupCors,
  configuredSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  ensurePostMethod,
  ensureIdTokenPresent,
  createEnsureValidIdToken,
  selectVariantDoc,
  createHandleAssignModerationJob,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshot,
  createGuardChain,
  createRunGuards,
  createEnsureUserRecord,
  buildAssignment,
  createModeratorRefFactory,
  createFirebaseResources,
  random,
} from '../../core/cloud/assign-moderation-job/core.js';
import { createAssignModerationWorkflow } from './workflow.js';

export {
  createAssignModerationApp,
  createCorsOriginHandler,
  createCorsOptions,
  createSetupCors,
  createConfiguredSetupCors,
  configuredSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  ensurePostMethod,
  ensureIdTokenPresent,
  createEnsureValidIdToken,
  selectVariantDoc,
  createHandleAssignModerationJob,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshot,
  createGuardChain,
  createRunGuards,
  createEnsureUserRecord,
  buildAssignment,
  createModeratorRefFactory,
  createFirebaseResources,
  random,
  createHandleAssignModerationJobWithFirebaseResources,
};

export function createAssignModerationWorkflowWithCoreDependencies({
  runGuards,
  fetchVariantSnapshot,
  createModeratorRef,
  now,
  random,
}) {
  return createAssignModerationWorkflow({
    runGuards,
    fetchVariantSnapshot,
    selectVariantDoc,
    buildAssignment,
    createModeratorRef,
    now,
    random,
  });
}

export function createHandleAssignModerationJobWithDependencies({
  runGuards,
  fetchVariantSnapshot,
  createModeratorRef,
  now,
  random,
}) {
  const assignModerationWorkflow =
    createAssignModerationWorkflowWithCoreDependencies({
      runGuards,
      fetchVariantSnapshot,
      createModeratorRef,
      now,
      random,
    });

  return createHandleAssignModerationJob(assignModerationWorkflow);
}

export function createHandleAssignModerationJobWithFirebaseResources({
  runGuards,
  fetchVariantSnapshot,
  db,
  now,
  random,
}) {
  const createModeratorRef = createModeratorRefFactory(db);

  return createHandleAssignModerationJobWithDependencies({
    runGuards,
    fetchVariantSnapshot,
    createModeratorRef,
    now,
    random,
  });
}
