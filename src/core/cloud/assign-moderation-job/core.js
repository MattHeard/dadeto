/**
 * Extract the ID token from a request body.
 * @param {import('express').Request} req HTTP request object.
 * @returns {string | undefined} The ID token if present.
 */
export function getIdTokenFromRequest(req) {
  const { id_token: idToken } = req?.body ?? {};
  return idToken;
}

/**
 * Ensure the request method is POST.
 * @param {{ req: import('express').Request }} context Guard context containing the request.
 * @returns {GuardResult} Guard result with an error when the method is not POST.
 */
export function ensurePostMethod({ req }) {
  if (req?.method === 'POST') {
    return {};
  }

  return {
    error: { status: 405, body: 'POST only' },
  };
}

/**
 * Extract the ID token and ensure it is present.
 * @param {{ req: import('express').Request }} context Guard context containing the request.
 * @returns {GuardResult} Guard result containing the token or an error when missing.
 */
export function ensureIdTokenPresent({ req }) {
  const idToken = getIdTokenFromRequest(req);
  if (idToken) {
    return { context: { idToken } };
  }

  return { error: { status: 400, body: 'Missing id_token' } };
}

/**
 * Build a guard that verifies Firebase ID tokens.
 * @param {{ verifyIdToken: (token: string) => Promise<unknown> }} authInstance Firebase auth instance.
 * @returns {(context: { idToken: string }) => Promise<GuardResult>} Guard ensuring the token is valid.
 */
export function createEnsureValidIdToken(authInstance) {
  return async function ensureValidIdToken({ idToken }) {
    try {
      const decoded = await authInstance.verifyIdToken(idToken);
      return { context: { decoded } };
    } catch (err) {
      return {
        error: {
          status: 401,
          body: err?.message ?? 'Invalid or expired token',
        },
      };
    }
  };
}

/**
 * Build a guard that ensures the authenticated user record exists.
 * @param {{ getUser: (uid: string) => Promise<import('firebase-admin/auth').UserRecord> }} authInstance Firebase auth instance.
 * @returns {(context: { decoded: { uid: string } }) => Promise<GuardResult>} Guard ensuring the user record can be fetched.
 */
export function createEnsureUserRecord(authInstance) {
  return async function ensureUserRecord({ decoded }) {
    try {
      const userRecord = await authInstance.getUser(decoded.uid);
      return { context: { userRecord } };
    } catch (err) {
      return {
        error: {
          status: 401,
          body: err?.message ?? 'Invalid or expired token',
        },
      };
    }
  };
}

/**
 * Build the guard runner for the assign moderation workflow.
 * @param {{ verifyIdToken: (token: string) => Promise<unknown>, getUser: (uid: string) => Promise<unknown> }} authInstance
 * Firebase auth instance providing token verification and user lookup.
 * @returns {(context: { req: import('express').Request }) => Promise<{ error?: GuardError, context?: GuardContext }>}
 * Guard chain executor configured with the standard moderation guards.
 */
export function createRunGuards(authInstance) {
  const ensureValidIdToken = createEnsureValidIdToken(authInstance);
  const ensureUserRecord = createEnsureUserRecord(authInstance);

  return createGuardChain([
    ensurePostMethod,
    ensureIdTokenPresent,
    ensureValidIdToken,
    ensureUserRecord,
  ]);
}

/**
 * Generate a random number between 0 (inclusive) and 1 (exclusive).
 * @returns {number} Pseudo-random number.
 */
export function random() {
  return Math.random();
}

/**
 * Create the CORS origin handler for the moderation Express app.
 * @param {string[]} allowedOrigins Origins permitted to call the endpoint.
 * @returns {(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void}
 * Express CORS origin handler.
 */
export function createCorsOriginHandler(allowedOrigins) {
  return function corsOriginHandler(origin, cb) {
    const isOriginAllowed = !origin || allowedOrigins.includes(origin);

    if (isOriginAllowed) {
      cb(null, true);
      return;
    }

    cb(new Error('CORS'));
  };
}

/**
 * Initialize Firebase resources, configure CORS, and expose dependencies.
 * @param {() => { db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} initializeFirebaseApp
 * Function that initializes Firebase and returns dependencies.
 * @param {(options: { origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods:
 *   string[] }) => unknown} corsFn
 * CORS middleware factory function.
 * @param {{ allowedOrigins?: string[] }} corsConfig CORS configuration for the endpoint.
 * @param {(appInstance: import('express').Express, expressModule: unknown) => void} configureBodyParser
 * Callback invoked with the Express app for registering body parsing middleware.
 * @param {unknown} expressModule
 * Express module exposing the urlencoded middleware factory.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} Initialized dependencies.
 */
export function createAssignModerationApp(
  initializeFirebaseApp,
  corsFn,
  corsConfig,
  configureBodyParser,
  expressModule
) {
  const { db, auth, app } = initializeFirebaseApp();
  const setupCors = configuredSetupCors(corsFn);
  setupCors(app, corsConfig);
  configureBodyParser(app, expressModule);

  return { db, auth, app };
}

/**
 * Build the Firebase resources used by the assign moderation job.
 * @param {() => { db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} initializeFirebaseApp
 * Function that initializes Firebase and returns dependencies.
 * @param {(options: { origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void,
 *   methods: string[] }) => unknown} corsFn
 * CORS middleware factory function.
 * @param {{ allowedOrigins?: string[] }} corsConfig CORS configuration for the endpoint.
 * @param {unknown} expressModule Express module exposing the urlencoded middleware factory.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} Initialized dependencies.
 */
export function createFirebaseResources(
  initializeFirebaseApp,
  corsFn,
  corsConfig,
  expressModule
) {
  return createAssignModerationApp(
    initializeFirebaseApp,
    corsFn,
    corsConfig,
    configureUrlencodedBodyParser,
    expressModule
  );
}

/**
 * Build the CORS middleware options for the moderation app.
 * @param {(allowedOrigins: string[]) => (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} createCorsOriginHandlerFn
 * Factory that produces the origin callback for the CORS middleware.
 * @param {{ allowedOrigins?: string[], methods?: string[] }} corsConfig CORS configuration for the endpoint.
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }}
 * Configuration object for the CORS middleware.
 */
export function createCorsOptions(createCorsOriginHandlerFn, corsConfig) {
  const { allowedOrigins } = corsConfig;

  return {
    ...corsConfig,
    origin: createCorsOriginHandlerFn(allowedOrigins),
    methods: ['POST'],
  };
}

/**
 * Create a function that wires CORS middleware onto an Express app.
 * @param {(allowedOrigins: string[]) => (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void}
 createCorsOriginHandlerFn
 * Factory that produces the origin callback for the CORS middleware.
 * @param {(options: { origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }) => unknown}
 corsFn
 * CORS middleware factory function.
 * @returns {(appInstance: import('express').Express, corsConfig: { allowedOrigins?: string[] }) => void}
 * Function that applies the configured CORS middleware to the Express app.
 */
export function createSetupCors(createCorsOriginHandlerFn, corsFn) {
  return function setupCors(appInstance, corsConfig) {
    const corsOptions = createCorsOptions(
      createCorsOriginHandlerFn,
      corsConfig
    );

    appInstance.use(corsFn(corsOptions));
  };
}

/**
 * Preconfigure the setupCors helper with the default origin handler.
 * @param {(createCorsOriginHandlerFn: typeof createCorsOriginHandler, corsFn: unknown) =>
 *   (appInstance: import('express').Express, corsConfig: { allowedOrigins?: string[] }) => void} createSetupCorsFn
 * Function that builds the CORS setup callback.
 * @param {typeof createCorsOriginHandler} createCorsOriginHandlerFn Function creating the origin handler.
 * @returns {(corsFn: unknown) => (appInstance: import('express').Express, corsConfig: { allowedOrigins?: string[] }) => void}
 * Factory that accepts a CORS implementation and returns the configured setup function.
 */
export function createConfiguredSetupCors(
  createSetupCorsFn,
  createCorsOriginHandlerFn
) {
  return function configuredSetupCors(corsFn) {
    return createSetupCorsFn(createCorsOriginHandlerFn, corsFn);
  };
}

/**
 * Default setupCors helper wired to the internal CORS origin handler.
 * @type {(corsFn: unknown) => (appInstance: import('express').Express, corsConfig: { allowedOrigins?: string[] }) => void}
 */
export const configuredSetupCors = createConfiguredSetupCors(
  createSetupCors,
  createCorsOriginHandler
);

/**
 * Register body parsing middleware for moderation requests.
 * @param {{ use: (middleware: unknown) => void }} appInstance Express application instance.
 * @param {{ urlencoded: (options: { extended: boolean }) => unknown }} expressModule Express module exposing urlencoded.
 * @returns {void}
 */
export function configureUrlencodedBodyParser(appInstance, expressModule) {
  const urlencodedMiddleware = expressModule.urlencoded({ extended: false });
  appInstance.use(urlencodedMiddleware);
}

/**
 * Select the first document from a snapshot when available.
 * @param {{ empty: boolean, docs?: unknown[] }} snapshot Query snapshot containing candidate documents.
 * @returns {{ variantDoc?: unknown, errorMessage?: string }} Selected document or an error message.
 */
export function selectVariantDoc(snapshot) {
  const [variantDoc] = snapshot?.docs ?? [];
  if (!variantDoc || snapshot?.empty) {
    return { errorMessage: 'Variant fetch failed 🤷' };
  }

  return { variantDoc };
}

/**
 * Build a moderation assignment referencing the selected variant.
 * @param {unknown} variantRef Firestore document reference for the variant.
 * @param {unknown} createdAt Timestamp representing when the assignment was created.
 * @returns {{ variant: unknown, createdAt: unknown }} Assignment payload persisted to Firestore.
 */
export function buildAssignment(variantRef, createdAt) {
  return {
    variant: variantRef,
    createdAt,
  };
}

/**
 * Create a helper that resolves moderator document references.
 * @param {{ collection: (name: string) => { doc: (id: string) => unknown } }} database Firestore database instance.
 * @returns {(uid: string) => unknown} Function that builds references to moderator documents.
 */
export function createModeratorRefFactory(database) {
  return function createModeratorRef(uid) {
    return database.collection('moderators').doc(uid);
  };
}

/**
 * @typedef {object} VariantQueryDescriptor
 * @property {"zeroRated"|"any"} reputation Reputation filter applied to the query.
 * @property {">="|"<"} comparator Comparison operator applied to the random value.
 * @property {number} randomValue Random value that seeds the Firestore cursor.
 */

/**
 * Describe the queries used to fetch a moderation candidate.
 * @param {number} randomValue Random value that seeds the Firestore cursor.
 * @returns {VariantQueryDescriptor[]} Ordered query descriptors.
 */
export function buildVariantQueryPlan(randomValue) {
  return [
    {
      reputation: 'zeroRated',
      comparator: '>=',
      randomValue,
    },
    {
      reputation: 'zeroRated',
      comparator: '<',
      randomValue,
    },
    {
      reputation: 'any',
      comparator: '>=',
      randomValue,
    },
    {
      reputation: 'any',
      comparator: '<',
      randomValue,
    },
  ];
}

const snapshotHasResults = snapshot => snapshot?.empty === false;

/**
 * Evaluate a snapshot and continue the plan when empty.
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }>, index: number, snapshot: { empty?: boolean } }} input Query evaluation context.
 * @returns {Promise<unknown>|unknown} Snapshot containing results or the promise for the next step.
 */
function selectSnapshotFromStep({ plan, runQuery, index, snapshot }) {
  if (snapshotHasResults(snapshot)) {
    return snapshot;
  }

  return resolvePlanStep({
    plan,
    runQuery,
    index: index + 1,
    lastSnapshot: snapshot,
  });
}

/**
 * Resolve the query plan sequentially until a snapshot yields results.
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }>, index: number, lastSnapshot: unknown }} input Remaining plan execution state.
 * @returns {Promise<unknown>} Snapshot matching the selection criteria or the last evaluated snapshot.
 */
async function resolvePlanStep({ plan, runQuery, index, lastSnapshot }) {
  if (index >= plan.length) {
    return lastSnapshot;
  }

  const snapshot = await runQuery(plan[index]);
  return selectSnapshotFromStep({ plan, runQuery, index, snapshot });
}

/**
 * Create a Firestore-agnostic variant snapshot fetcher.
 * @param {{ runQuery: (descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }> }} deps
 * Adapter that executes a single query descriptor.
 * @returns {(randomValue: number) => Promise<unknown>} Function resolving with the first snapshot containing results.
 */
export function createVariantSnapshotFetcher({ runQuery }) {
  return async function getVariantSnapshot(randomValue) {
    const plan = buildVariantQueryPlan(randomValue);
    return resolvePlanStep({
      plan,
      runQuery,
      index: 0,
      lastSnapshot: undefined,
    });
  };
}

/**
 * Adapter that produces the getVariantSnapshot helper from a runQuery implementation.
 * @param {(descriptor: VariantQueryDescriptor) => Promise<{ empty?: boolean }>} runQuery Query executor.
 * @returns {(randomValue: number) => Promise<unknown>} Function resolving with the first snapshot containing results.
 */
export function createGetVariantSnapshot(runQuery) {
  return createVariantSnapshotFetcher({
    runQuery,
  });
}

/**
 * @typedef {object} GuardError
 * @property {number} status HTTP status code to return.
 * @property {string} body Body payload describing the error.
 */

/**
 * @typedef {object} GuardSuccess
 * @property {object} [context] Additional context to merge into the chain state.
 */

/**
 * @typedef {{ error: GuardError } | GuardSuccess | void} GuardResult
 */

/**
 * @typedef {object} GuardContext
 * @property {import('express').Request} req Incoming HTTP request.
 * @property {string} [idToken] Extracted Firebase ID token.
 * @property {import('firebase-admin/auth').DecodedIdToken} [decoded] Verified Firebase token payload.
 * @property {import('firebase-admin/auth').UserRecord} [userRecord] Authenticated moderator record.
 */

/**
 * @callback GuardFunction
 * @param {GuardContext} context Current guard context.
 * @returns {Promise<GuardResult> | GuardResult} Guard evaluation outcome.
 */

/**
 * Compose a sequence of guard functions that short-circuit on failure.
 * @param {GuardFunction[]} guards Guard functions to execute in order.
 * @returns {(initialContext: GuardContext) => Promise<{ error?: GuardError, context?: GuardContext }>}
 * Guard chain executor that resolves with either the accumulated context or the failure details.
 */
export function createGuardChain(guards) {
  return async function runChain(initialContext) {
    let context = initialContext;
    for (const guard of guards) {
      const result = await guard(context);
      if (result?.error) {
        return { error: result.error };
      }
      context = { ...context, ...(result?.context ?? {}) };
    }

    return { context };
  };
}

/**
 * Build the HTTP handler that assigns a moderation job to the caller.
 * @param {(context: { req: import('express').Request }) => Promise<{ status: number, body?: unknown }>} assignModerationWorkflow
 * Workflow that coordinates guard execution and variant selection.
 * @returns {(req: import('express').Request, res: import('express').Response) => Promise<void>}
 * Express-compatible request handler.
 */
export function createHandleAssignModerationJob(assignModerationWorkflow) {
  return async function handleAssignModerationJob(req, res) {
    const { status, body } = await assignModerationWorkflow({ req });

    res.status(status).send(body ?? '');
  };
}
