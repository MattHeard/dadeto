import {
  createAssignModerationApp,
  createSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  selectVariantDoc,
  createHandleAssignModerationJob as createHandleAssignModerationJobCore,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshotFromDbFactory,
  createRunGuards,
  buildAssignment,
  createModeratorRefFactory,
  createFirebaseResources,
  random,
} from '../../core/cloud/assign-moderation-job/core.js';

export {
  createAssignModerationApp,
  createSetupCors,
  configureUrlencodedBodyParser,
  getIdTokenFromRequest,
  selectVariantDoc,
  createHandleAssignModerationJobCore,
  buildVariantQueryPlan,
  createVariantSnapshotFetcher,
  createFetchVariantSnapshotFromDbFactory,
  createRunGuards,
  buildAssignment,
  createModeratorRefFactory,
  createFirebaseResources,
  random,
};

/**
 * @typedef {object} AssignModerationWorkflowDeps
 * @property {(context: { req: import("express").Request }) => Promise<{ error?: { status: number, body: string }, context?: { userRecord?: import("firebase-admin/auth").UserRecord } }>} runGuards
 * @property {(randomValue: number) => Promise<unknown>} fetchVariantSnapshot
 * @property {(snapshot: unknown) => { variantDoc?: { ref: unknown }, errorMessage?: string }} selectVariantDoc
 * @property {(variantRef: unknown, createdAt: unknown) => { variant: unknown, createdAt: unknown }} buildAssignment
 * @property {(uid: string) => { set: (assignment: unknown) => Promise<unknown> }} createModeratorRef
 * @property {() => unknown} now
 * @property {() => number} random
 */

/**
 * @typedef {{ req: import("express").Request }} AssignModerationWorkflowInput
 */

/**
 * Create the moderation assignment workflow.
 * @param {AssignModerationWorkflowDeps} deps Dependencies required by the workflow.
 * @returns {(input: AssignModerationWorkflowInput) => Promise<{ status: number, body?: string }>}
 */
export function createAssignModerationWorkflow({
  runGuards,
  fetchVariantSnapshot,
  selectVariantDoc,
  buildAssignment,
  createModeratorRef,
  now,
  random,
}) {
  return async function assignModerationWorkflow({ req }) {
    const guardResult = await runGuards({ req });

    if (guardResult?.error) {
      return {
        status: guardResult.error.status,
        body: guardResult.error.body,
      };
    }

    const { userRecord } = guardResult.context ?? {};

    if (!userRecord?.uid) {
      return { status: 500, body: 'Moderator lookup failed' };
    }

    const randomValue = random();
    const variantSnapshot = await fetchVariantSnapshot(randomValue);
    const { errorMessage, variantDoc } = selectVariantDoc(variantSnapshot);

    if (errorMessage) {
      return { status: 500, body: errorMessage };
    }

    const moderatorRef = createModeratorRef(userRecord.uid);
    const createdAt = now();
    const assignment = buildAssignment(variantDoc.ref, createdAt);
    await moderatorRef.set(assignment);

    return { status: 201, body: '' };
  };
}

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
