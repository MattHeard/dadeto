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
