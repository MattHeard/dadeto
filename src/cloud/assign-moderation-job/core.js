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
  createHandleAssignModerationJob as createHandleAssignModerationJobCore,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshot,
  createFetchVariantSnapshotFromDbFactory,
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
  createHandleAssignModerationJobCore,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshot,
  createFetchVariantSnapshotFromDbFactory,
  createGuardChain,
  createRunGuards,
  createEnsureUserRecord,
  buildAssignment,
  createModeratorRefFactory,
  createFirebaseResources,
  random,
};

export function createHandleAssignModerationJob(
  createRunVariantQuery,
  auth,
  db,
  now,
  random
) {
  const createFetchVariantSnapshotFromDb =
    createFetchVariantSnapshotFromDbFactory(createRunVariantQuery);

  const fetchVariantSnapshot = createFetchVariantSnapshotFromDb(db);

  return createHandleAssignModerationJobFromAuth(
    auth,
    fetchVariantSnapshot,
    db,
    now,
    random
  );
}

export function registerAssignModerationJobRoute(
  firebaseResources,
  createRunVariantQuery,
  now,
  random
) {
  const { db, auth, app } = firebaseResources;

  const handleAssignModerationJob = createHandleAssignModerationJob(
    createRunVariantQuery,
    auth,
    db,
    now,
    random
  );

  app.post('/', handleAssignModerationJob);

  return handleAssignModerationJob;
}

export function createAssignModerationJob(functionsModule, appInstance) {
  return functionsModule.region('europe-west1').https.onRequest(appInstance);
}

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

  return createHandleAssignModerationJobCore(assignModerationWorkflow);
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

export function createHandleAssignModerationJobFromAuth(
  auth,
  fetchVariantSnapshot,
  db,
  now,
  random
) {
  const runGuards = createRunGuards(auth);

  return createHandleAssignModerationJobWithFirebaseResources({
    runGuards,
    fetchVariantSnapshot,
    db,
    now,
    random,
  });
}
