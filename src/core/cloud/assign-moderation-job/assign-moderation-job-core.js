/** @typedef {import('../../../../types/native-http').NativeHttpRequest} NativeHttpRequest */
/** @typedef {import('../../../../types/native-http').NativeHttpResponse} NativeHttpResponse */
/** @typedef {import('../../../../types/native-http').NativeExpressApp} NativeExpressApp */

/**
 * @typedef {(environmentVariables: Record<string, unknown>) => string[]} ResolveAllowedOrigins
 */

/**
 * @typedef {object} CorsEnvironmentHelpers
 * @property {ResolveAllowedOrigins} getAllowedOrigins Resolves allowed origins from environment variables.
 * @property {() => Record<string, unknown>} getEnvironmentVariables Reads environment variables at runtime.
 */

/**
 * @typedef {(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void} CorsOriginHandler
 */

/**
 * @typedef {(allowedOrigins: string[]) => CorsOriginHandler} CorsOriginHandlerFactory
 */

/**
 * @typedef {(getEnvironmentVariables: () => Record<string, unknown>) => CorsOriginHandler} CorsOriginFactory
 */

/**
 * @typedef {(helpers: CorsEnvironmentHelpers) => CorsOriginHandler} CorsOriginResolver
 */

/**
 * Resolve the environment configuration used for Firestore operations.
 * @param {Record<string, unknown> | undefined} providedEnvironment Environment override supplied by the caller.
 * @param {() => Record<string, unknown>} getEnvironmentVariablesFn Getter returning the current environment variables.
 * @returns {Record<string, unknown> | undefined} Environment object used to configure Firestore.
 */
export function resolveFirestoreEnvironment(
  providedEnvironment,
  getEnvironmentVariablesFn
) {
  if (providedEnvironment !== undefined) {
    return providedEnvironment;
  }

  return getEnvironmentVariablesFn();
}

/**
 * Check if ensure function is custom.
 * @param {Function | undefined} ensureAppFn Ensure function.
 * @param {Function} defaultEnsureFn Default.
 * @returns {boolean} True if custom.
 */
function isCustomEnsureFunction(ensureAppFn, defaultEnsureFn) {
  return Boolean(ensureAppFn && ensureAppFn !== defaultEnsureFn);
}

/**
 * Check if get firestore function is custom.
 * @param {Function | undefined} getFirestoreFn Get function.
 * @param {Function} defaultGetFirestoreFn Default.
 * @returns {boolean} True if custom.
 */
function isCustomGetFirestoreFunction(getFirestoreFn, defaultGetFirestoreFn) {
  return Boolean(getFirestoreFn && getFirestoreFn !== defaultGetFirestoreFn);
}

/**
 * Detect whether any Firebase dependency overrides have been provided.
 * @param {{
 *   options?: { ensureAppFn?: Function, getFirestoreFn?: Function },
 *   defaultEnsureFn: Function,
 *   defaultGetFirestoreFn: Function,
 * }} deps Dependency bag containing overrides.
 * @returns {boolean} True when a dependency override exists.
 */
function hasCustomFirestoreFunctionOverrides({
  options,
  defaultEnsureFn,
  defaultGetFirestoreFn,
}) {
  const { ensureAppFn, getFirestoreFn } = options ?? {};

  const checks = [
    isCustomEnsureFunction(ensureAppFn, defaultEnsureFn),
    isCustomGetFirestoreFunction(getFirestoreFn, defaultGetFirestoreFn),
  ];

  return checks.some(Boolean);
}

/**
 * Check whether the caller supplied an environment override.
 * @param {{ providedEnvironment?: unknown }} deps Dependency bag with optional environment.
 * @returns {boolean} True when an override exists.
 */
function hasProvidedEnvironment({ providedEnvironment }) {
  return providedEnvironment !== undefined;
}

/**
 * Determine whether custom Firebase dependencies or a provided environment should be honored.
 * @param {{
 *   options?: { ensureAppFn?: Function, getFirestoreFn?: Function },
 *   defaultEnsureFn: Function,
 *   defaultGetFirestoreFn: Function,
 *   providedEnvironment?: unknown,
 * }} deps Dependency bag containing overrides and helpers.
 * @returns {boolean} True when custom dependencies or provided environment supersede defaults.
 */
export function shouldUseCustomFirestoreDependencies({
  options,
  defaultEnsureFn,
  defaultGetFirestoreFn,
  providedEnvironment,
}) {
  const hasOverrides = hasCustomFirestoreFunctionOverrides({
    options,
    defaultEnsureFn,
    defaultGetFirestoreFn,
  });

  if (hasProvidedEnvironment({ providedEnvironment })) {
    return true;
  }

  return hasOverrides;
}

/**
 * Create helpers that track Firebase initialization state.
 * @returns {{
 *   hasBeenInitialized: () => boolean,
 *   markInitialized: () => void,
 *   reset: () => void,
 * }} Initialization state tracker.
 */
export function createFirebaseInitialization() {
  let initialized = false;

  return {
    hasBeenInitialized() {
      return initialized;
    },
    markInitialized() {
      initialized = true;
    },
    reset() {
      initialized = false;
    },
  };
}

/**
 * Extract the request body from an Express request.
 * @param {NativeHttpRequest} req HTTP request object.
 * @returns {Record<string, unknown> | undefined} Request body when available.
 */
export function getBodyFromRequest(req) {
  return /** @type {Record<string, unknown> | undefined} */ (req?.body);
}

/**
 * Extract the ID token from a request body.
 * @param {NativeHttpRequest} req HTTP request object.
 * @returns {string | undefined} The ID token if present.
 */
export function getIdTokenFromRequest(req) {
  const body = /** @type {{ id_token?: string } | undefined} */ (
    getBodyFromRequest(req)
  );

  return body?.id_token;
}

/**
 * Determine whether an Express request uses the POST method.
 * @param {NativeHttpRequest} req HTTP request object.
 * @returns {boolean} True when the request method is POST.
 */
function isPostRequest(req) {
  return req?.method === 'POST';
}

/**
 * @typedef {object} ErrorWithMessage
 * @property {string} message Error message.
 */

/**
 * Ensure the request method is POST.
 * @param {GuardContext} context Guard context containing the request.
 * @returns {GuardResult} Guard result with an error when the method is not POST.
 */
function ensurePostMethod(context) {
  const req = /** @type {NativeHttpRequest} */ (context.req);
  if (isPostRequest(req)) {
    return {};
  }

  return getPostOnlyMethodErrorResult();
}

/**
 * Build the guard result for non-POST requests.
 * @returns {GuardResult} Guard result indicating the request method must be POST.
 */
function getPostOnlyMethodErrorResult() {
  return {
    error: { status: 405, body: 'POST only' },
  };
}

/**
 * Build the guard result for an ID token presence check.
 * @param {string | undefined} idToken ID token extracted from the request.
 * @returns {GuardResult} Guard result mirroring the ID token validation outcome.
 */
function getIdTokenGuardResult(idToken) {
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
/**
 * Create token error.
 * @param {unknown} err Error.
 * @returns {object} Error result.
 */
function createTokenError(err) {
  return {
    error: {
      status: 401,
      body: resolveTokenErrorMessage(err),
    },
  };
}

/**
 * Retrieve a string message when present on an error object.
 * @param {ErrorWithMessage | unknown} err Error captured during token validation.
 * @returns {string} Extracted message when available, otherwise an empty string.
 */
function extractTokenErrorMessage(err) {
  return resolveTokenMessage(err);
}

/**
 * Check if a value is a non-null object.
 * @param {unknown} value Value to check.
 * @returns {value is object} True if value is an object.
 */
function isObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Determine whether the error exposes a string message.
 * @param {unknown} err Error captured during token validation.
 * @returns {boolean} True when the message can be read as a string.
 */
function hasTokenMessage(err) {
  if (!isObject(err)) {
    return false;
  }

  const obj = /** @type {any} */ (err);
  return typeof obj.message === 'string';
}

/**
 * Extract the message text from the provided error object when available.
 * @param {ErrorWithMessage | unknown} err Error captured during token validation.
 * @returns {string} Error message string or an empty string.
 */
function resolveTokenMessage(err) {
  if (!hasTokenMessage(err)) {
    return '';
  }

  return /** @type {ErrorWithMessage} */ (err).message;
}

/**
 * Normalize token errors into a user-friendly message.
 * @param {unknown} err Error captured while processing the token.
 * @returns {string} Message that explains the failure.
 */
function resolveTokenErrorMessage(err) {
  const message = extractTokenErrorMessage(err);
  return message || 'Invalid or expired token';
}

/**
 * Build a guard that verifies Firebase ID tokens using the provided auth instance.
 * @param {{ verifyIdToken: (token: string) => Promise<import('firebase-admin/auth').DecodedIdToken> }} authInstance Firebase auth helper used to validate tokens.
 * @returns {GuardFunction} Guard that enforces token validity.
 */
function createEnsureValidIdToken(authInstance) {
  return async function ensureValidIdToken(context) {
    const { idToken } = context;

    if (!idToken) {
      return createTokenError('Missing id_token');
    }

    return verifyIdToken(authInstance, idToken);
  };
}

/**
 * Verify the Firebase ID token and convert the result into a guard outcome.
 * @param {{ verifyIdToken: (token: string) => Promise<import('firebase-admin/auth').DecodedIdToken> }} authInstance Firebase auth helper.
 * @param {string} idToken Token to verify.
 * @returns {Promise<GuardResult>} Guard outcome with the decoded token or an error.
 */
async function verifyIdToken(authInstance, idToken) {
  try {
    const decoded = await authInstance.verifyIdToken(idToken);
    return { context: { decoded } };
  } catch (err) {
    return createTokenError(err);
  }
}

/**
 * Build a guard that ensures the authenticated user record exists.
 * @param {{ getUser: (uid: string) => Promise<import('firebase-admin/auth').UserRecord> }} authInstance Firebase auth instance.
 * @returns {GuardFunction} Guard ensuring the user record can be fetched.
 */
function createEnsureUserRecord(authInstance) {
  return async function ensureUserRecord(context) {
    const { decoded } = context;

    if (!decoded) {
      return createTokenError('Missing decoded token');
    }

    return fetchUserRecord(authInstance, decoded.uid);
  };
}

/**
 * Load the Firebase user record while normalizing failures into guard outcomes.
 * @param {{ getUser: (uid: string) => Promise<import('firebase-admin/auth').UserRecord> }} authInstance Firebase auth helper.
 * @param {string} uid Moderator UID.
 * @returns {Promise<GuardResult>} Guard result with the user record or an error.
 */
async function fetchUserRecord(authInstance, uid) {
  try {
    const userRecord = await authInstance.getUser(uid);
    return { context: { userRecord } };
  } catch (err) {
    return createTokenError(err);
  }
}

/**
 * Get ID token from a guard context.
 * @param {GuardContext} context Guard context containing the request.
 * @returns {Promise<GuardResult> | GuardResult} Guard result with the ID token if available.
 */
function ensureIdTokenPresent(context) {
  const req = context.req;
  const request = /** @type {NativeHttpRequest} */ (req);
  return getIdTokenGuardResult(getIdTokenFromRequest(request));
}

/**
 * Build the guard runner for the assign moderation workflow.
 * @param {{ verifyIdToken: (token: string) => Promise<import('firebase-admin/auth').DecodedIdToken>, getUser: (uid: string) => Promise<import('firebase-admin/auth').UserRecord> }} authInstance
 * Firebase auth instance providing token verification and user lookup.
 * @returns {(context: { req: NativeHttpRequest }) => Promise<{ error?: GuardError, context?: GuardContext }>}
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
/**
 * Check if origin is allowed.
 * @param {string | undefined} origin Origin.
 * @param {string[]} allowedOrigins Allowed origins.
 * @returns {boolean} True if allowed.
 */
function isOriginAllowed(origin, allowedOrigins) {
  return !origin || allowedOrigins.includes(origin);
}

/**
 * Build an Express-compatible origin handler from the resolved allow-list.
 * @param {string[]} allowedOrigins Origins permitted to call the moderation API.
 * @returns {CorsOriginHandler} Origin handler used by CORS middleware.
 */
export function createCorsOriginHandler(allowedOrigins) {
  return function corsOriginHandler(origin, cb) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      cb(null, true);
      return;
    }
    cb(new Error('CORS'));
  };
}

/**
 * Build a factory that composes a CORS origin handler from environment variables.
 * @param {{
 *   getAllowedOrigins: ResolveAllowedOrigins,
 *   createCorsOriginHandler: CorsOriginHandlerFactory,
 * }} deps Dependencies required to build the origin handler.
 * @returns {CorsOriginFactory} Factory that accepts an environment getter and returns the configured origin callback.
 */
export function createCorsOriginFactory({
  getAllowedOrigins,
  createCorsOriginHandler,
}) {
  return function createCorsOrigin(getEnvironmentVariables) {
    const environmentVariables = getEnvironmentVariables();
    const allowedOrigins = getAllowedOrigins(environmentVariables);

    return createCorsOriginHandler(allowedOrigins);
  };
}

/**
 * Compose helpers that resolve the CORS origin handler from environment configuration.
 * @param {{
 *   createCreateCorsOrigin: typeof createCreateCorsOrigin,
 * }} deps Dependencies required to build the environment-aware factory.
 * @returns {CorsOriginResolver} Factory that accepts environment helpers and resolves the configured origin handler.
 */
export function createCreateCorsOriginFromEnvironment({
  createCreateCorsOrigin,
}) {
  return function createCorsOriginFromEnvironment({
    getAllowedOrigins,
    getEnvironmentVariables,
  }) {
    const createCorsOrigin = createCreateCorsOrigin({
      getAllowedOrigins,
    });

    return createCorsOrigin(getEnvironmentVariables);
  };
}

/**
 * Resolve the CORS origin handler directly from environment utilities.
 * @param {CorsEnvironmentHelpers} deps Dependencies required to compute the origin handler.
 * @returns {CorsOriginHandler} Configured CORS origin handler.
 */
export function createCorsOriginFromEnvironment({
  getAllowedOrigins,
  getEnvironmentVariables,
}) {
  const createCorsOriginFromEnvironmentFn =
    createCreateCorsOriginFromEnvironment({
      createCreateCorsOrigin,
    });

  return createCorsOriginFromEnvironmentFn({
    getAllowedOrigins,
    getEnvironmentVariables,
  });
}

/**
 * Build a helper that configures the createCorsOrigin factory dependencies.
 * @param {{
 *   getAllowedOrigins: ResolveAllowedOrigins,
 * }} deps Dependencies required to compose the CORS origin factory.
 * @returns {CorsOriginFactory} Configured createCorsOrigin function that accepts an environment getter.
 */
export function createCreateCorsOrigin({ getAllowedOrigins }) {
  return createCorsOriginFactory({
    getAllowedOrigins,
    createCorsOriginHandler,
  });
}

/**
 * Build the CORS middleware options for the moderation app.
 * @param {CorsOriginHandlerFactory} createCorsOriginHandlerFn Factory that produces the origin callback for the CORS middleware.
 * @param {{ allowedOrigins?: string[], methods?: string[] }} corsConfig CORS configuration for the endpoint.
 * @returns {{ origin: CorsOriginHandler, methods: string[] }} Configuration object for the CORS middleware.
 */
function buildCorsOptions(createCorsOriginHandlerFn, corsConfig) {
  const allowedOrigins = corsConfig.allowedOrigins ?? [];

  return {
    ...corsConfig,
    origin: createCorsOriginHandlerFn(allowedOrigins),
    methods: ['POST'],
  };
}

/**
 * Create a function that wires CORS middleware onto an Express app.
 * @param {CorsOriginHandlerFactory} createCorsOriginHandlerFn - Factory that produces the origin callback for the CORS middleware.
 * @param {(options: { origin: CorsOriginHandler, methods: string[] }) => unknown} corsFn - CORS middleware factory function.
 * @returns {(appInstance: NativeExpressApp, corsConfig: { allowedOrigins?: string[] }) => void} Function that applies the configured CORS middleware to the Express app.
 */
export function createSetupCors(createCorsOriginHandlerFn, corsFn) {
  return function setupCors(appInstance, corsConfig) {
    const corsOptions = buildCorsOptions(createCorsOriginHandlerFn, corsConfig);

    appInstance.use(corsFn(corsOptions));
  };
}

/**
 * Build the CORS options object using environment-aware helpers.
 * @param {ResolveAllowedOrigins} getAllowedOriginsFunction Resolves allowed origins from environment variables.
 * @param {() => Record<string, unknown>} getEnvironmentVariablesFunction Reads environment variables at runtime.
 * @returns {{ origin: CorsOriginHandler, methods: string[] }} Configuration object for the CORS middleware.
 */
export function createCorsOptions(
  getAllowedOriginsFunction,
  getEnvironmentVariablesFunction
) {
  const environmentVariables = getEnvironmentVariablesFunction();
  const allowedOrigins = getAllowedOriginsFunction(environmentVariables);
  const corsOrigin = createCorsOriginHandler(allowedOrigins);

  return {
    origin: corsOrigin,
    methods: ['POST'],
  };
}

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
 * Check if snapshot is empty.
 * @param {object} snapshot Snapshot.
 * @param {unknown} variantDoc Variant doc.
 * @returns {boolean} True if empty.
 */
function isSnapshotEmpty(snapshot, variantDoc) {
  return isMissingVariantDoc(variantDoc) || snapshotIsEmpty(snapshot);
}

/** @typedef {import('firebase-admin/firestore').QueryDocumentSnapshot<import('firebase-admin/firestore').DocumentData>} VariantDocSnapshot */

/**
 * @typedef {{
 *   empty?: boolean,
 *   docs?: VariantDocSnapshot[],
 * }} VariantSnapshot
 */

/**
 * Determine whether a variant document is missing from the snapshot.
 * @param {unknown} variantDoc Candidate document.
 * @returns {boolean} True when no variant document was returned.
 */
function isMissingVariantDoc(variantDoc) {
  return !variantDoc;
}

/**
 * Resolve whether the snapshot explicitly marked itself empty.
 * @param {{ empty?: unknown } | undefined} snapshot Snapshot candidate.
 * @returns {boolean} True when the snapshot declares itself empty.
 */
function snapshotIsEmpty(snapshot) {
  return Boolean(snapshot?.empty);
}

/**
 * @typedef {object} SelectVariantDocResult
 * @property {VariantDocSnapshot} [variantDoc] Selected variant document snapshot when available.
 * @property {string} [errorMessage] Human-readable message explaining why selection failed.
 */

/**
 * Select the primary variant document from a query snapshot when it exists.
 * @param {VariantSnapshot} snapshot Query snapshot containing candidate documents.
 * @returns {SelectVariantDocResult} Selected document when present or an error message when missing.
 */
export function selectVariantDoc(snapshot) {
  const docs = resolveSnapshotDocs(snapshot);
  const [variantDoc] = docs;

  if (isSnapshotEmpty(snapshot, variantDoc)) {
    return { errorMessage: 'Variant fetch failed 🤷' };
  }
  return { variantDoc };
}

/**
 * Safely extract document snapshots from a query result.
 * @param {VariantSnapshot | undefined} snapshot Firestore query snapshot that may contain docs.
 * @returns {VariantDocSnapshot[]} Document snapshots if present, otherwise an empty array.
 */
function resolveSnapshotDocs(snapshot) {
  if (!hasSnapshotDocs(snapshot)) {
    return [];
  }

  return snapshot.docs;
}

/**
 * Check whether the snapshot exposes document entries.
 * @param {VariantSnapshot | undefined} snapshot Snapshot to inspect.
 * @returns {snapshot is { docs: VariantDocSnapshot[] }} True when an array of docs exists.
 */
function hasSnapshotDocs(snapshot) {
  if (!snapshot) {
    return false;
  }

  return Array.isArray(snapshot.docs);
}

/**
 * Create a helper that resolves moderator document references.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore database instance.
 * @returns {(uid: string) => import('firebase-admin/firestore').DocumentReference} Function that builds references to moderator documents.
 */
export function createModeratorRefFactory(database) {
  return function createModeratorRef(uid) {
    return database.collection('moderators').doc(uid);
  };
}

/**
 * Create the base variants collection group query.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore database instance.
 * @returns {import('firebase-admin/firestore').Query} Base variants query.
 */
export function createVariantsQuery(database) {
  return database.collectionGroup('variants');
}

/**
 * Scope a variants query based on moderator reputation.
 * @param {'zeroRated' | string} reputation Reputation category for moderators.
 * @param {import('firebase-admin/firestore').Query} variantsQuery Query for fetching variants.
 * @returns {import('firebase-admin/firestore').Query} Query scoped to the provided reputation.
 */
export function createReputationScopedQuery(reputation, variantsQuery) {
  if (reputation === 'zeroRated') {
    return variantsQuery.where('moderatorReputationSum', '==', 0);
  }

  return variantsQuery;
}

/**
 * Build a reputation-scoped variants query from a Firestore instance.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore database instance.
 * @param {'zeroRated' | string} reputation Reputation category for moderators.
 * @returns {import('firebase-admin/firestore').Query} Query scoped to the provided reputation.
 */
export function createReputationScopedVariantsQuery(database, reputation) {
  const variantsQuery = createVariantsQuery(database);

  return createReputationScopedQuery(reputation, variantsQuery);
}

/**
 * @typedef {object} VariantQueryDescriptor
 * @property {"zeroRated"|"any"} reputation Reputation filter applied to the query.
 * @property {">="|"<"} comparator Comparison operator applied to the random value.
 * @property {number} randomValue Random value that seeds the Firestore cursor.
 */

/**
 * Create a query runner that fetches a single variant candidate.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore database instance.
 * @returns {(descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>} Query runner bound to the provided database.
 */
export function createRunVariantQuery(database) {
  return function runVariantQuery({ reputation, comparator, randomValue }) {
    const reputationScopedQuery = createReputationScopedVariantsQuery(
      database,
      reputation
    );
    const orderedQuery = reputationScopedQuery.orderBy('rand', 'asc');
    const filteredQuery = orderedQuery.where('rand', comparator, randomValue);
    const limitedQuery = filteredQuery.limit(1);

    return limitedQuery.get();
  };
}

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

/**
 * Check if snapshot contains results.
 * @param {VariantSnapshot} snapshot Snapshot to check.
 * @returns {boolean} True if snapshot has results.
 */
const snapshotHasResults = snapshot => snapshot?.empty === false;

/**
 * Evaluate a snapshot and continue the plan when empty.
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>, index: number, snapshot: VariantSnapshot }} input Query evaluation context.
 * @returns {Promise<VariantSnapshot>} Snapshot containing results or the promise for the next step.
 */
async function selectSnapshotFromStep({ plan, runQuery, index, snapshot }) {
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
 * @param {{ plan: VariantQueryDescriptor[], runQuery: (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>, index: number, lastSnapshot: VariantSnapshot | undefined }} input Remaining plan execution state.
 * @returns {Promise<VariantSnapshot>} Snapshot matching the selection criteria or the last evaluated snapshot.
 */
async function resolvePlanStep({ plan, runQuery, index, lastSnapshot }) {
  if (index >= plan.length) {
    return ensureSnapshot(lastSnapshot);
  }

  const snapshot = await runQuery(plan[index]);
  return selectSnapshotFromStep({ plan, runQuery, index, snapshot });
}

/**
 * Provide an empty snapshot structure when no data exists.
 * @param {VariantSnapshot | undefined} snapshot Candidate snapshot.
 * @returns {VariantSnapshot} Snapshot with actual data or an empty marker.
 */
function ensureSnapshot(snapshot) {
  if (snapshot) {
    return snapshot;
  }

  return { empty: true };
}

/**
 * Create a Firestore-agnostic variant snapshot fetcher.
 * @param {{ runQuery: (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot> }} deps
 * Adapter that executes a single query descriptor.
 * @returns {(randomValue: number) => Promise<VariantSnapshot>} Function resolving with the first snapshot containing results.
 */
export function createVariantSnapshotFetcher({ runQuery }) {
  return async function fetchVariantSnapshot(randomValue) {
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
 * @typedef {(database: import('firebase-admin/firestore').Firestore) => (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>} CreateRunVariantQueryFunction
 */

/**
 * Build a factory that produces Firestore-backed variant snapshot fetchers.
 * @param {CreateRunVariantQueryFunction} createRunVariantQueryFn
 * Adapter factory that accepts a database instance and returns a query executor.
 * @returns {(database: import('firebase-admin/firestore').Firestore) => (randomValue: number) => Promise<VariantSnapshot>} Factory producing snapshot fetchers bound to a
 * Firestore database.
 */
export function createFetchVariantSnapshotFromDbFactory(
  createRunVariantQueryFn
) {
  return function createFetchVariantSnapshotFromDb(database) {
    const runVariantQuery = createRunVariantQueryFn(database);
    return createVariantSnapshotFetcher({
      runQuery: runVariantQuery,
    });
  };
}

/**
 * @typedef {object} GuardError
 * @property {number} status HTTP status code to return.
 * @property {string} body Body payload describing the error.
 */

/**
 * @typedef {object} GuardResult
 * @property {GuardContext} [context] Guard context returned when the guard succeeds.
 * @property {GuardError} [error] Guard error payload returned when execution halts.
 */

/**
 * @typedef {object} GuardContext
 * @property {NativeHttpRequest} [req] Incoming HTTP request.
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
 * Merge guard results into the running context.
 * @param {GuardResult} result Result produced by a guard.
 * @param {GuardContext} context Current context to enrich.
 * @returns {GuardContext} Combined context with accumulated data.
 */
function processGuardResult(result, context) {
  return mergeGuardContext(result?.context, context);
}

/**
 * Merge guard context when available.
 * @param {GuardContext | undefined} guardContext New context data, if provided.
 * @param {GuardContext} context Context to enrich.
 * @returns {GuardContext} Enriched context when guardContext exists; otherwise the original context.
 */
function mergeGuardContext(guardContext, context) {
  let mergedContext = context;
  if (guardContext) {
    mergedContext = mergeContexts(context, guardContext);
  }

  return mergedContext;
}

/**
 * Merge guard contexts while preserving existing data.
 * @param {GuardContext} context Current context.
 * @param {GuardContext} guardContext New context data returned by a guard.
 * @returns {GuardContext} Combined context object.
 */
function mergeContexts(context, guardContext) {
  return { ...context, ...guardContext };
}

/**
 * Execute a single guard function and normalize the outcome.
 * @param {GuardFunction} guard Guard function to run.
 * @param {GuardContext} context Context supplied to the guard.
 * @returns {Promise<{ context?: GuardContext, error?: GuardError }>} Execution result.
 */
async function executeSingleGuard(guard, context) {
  const result = await guard(context);
  handleGuardError(result);

  return { context: processGuardResult(result, context) };
}

/**
 * Throw when the guard output contains an error.
 * @param {GuardResult} result Guard evaluation output.
 */
function handleGuardError(result) {
  if (hasGuardError(result)) {
    throw result;
  }
}

/**
 * Detect when the guard result exposes an error.
 * @param {GuardResult} result Guard evaluation output.
 * @returns {boolean} True when an error should be thrown.
 */
function hasGuardError(result) {
  return Boolean(result?.error);
}

/**
 * Compose a sequence of guards that short-circuit on failure.
 * @param {GuardFunction[]} guards Guard functions executed in order.
 * @returns {(initialContext: GuardContext) => Promise<{ error?: GuardError, context?: GuardContext }>}
 * Guard chain executor that resolves with either the accumulated context or the failure details.
 */
function createGuardChain(guards) {
  return async function runChain(initialContext) {
    try {
      return await executeGuardSequence(guards, initialContext);
    } catch (guardResult) {
      return guardResult;
    }
  };
}

/**
 * Execute guards sequentially.
 * @param {GuardFunction[]} guards Guard list.
 * @param {GuardContext} initialContext Starting context.
 * @returns {Promise<{ error?: GuardError, context?: GuardContext }>} Guard chain result.
 */
async function executeGuardSequence(guards, initialContext) {
  let context = initialContext;
  for (const guard of guards) {
    const guardResult = await executeSingleGuard(guard, context);
    context = guardResult.context ?? context;
  }
  return { context };
}

/**
 * Build the HTTP handler that assigns a moderation job to the caller.
 * @param {(context: { req: NativeHttpRequest }) => Promise<{ status: number, body?: unknown }>} assignModerationWorkflow
 * Workflow that coordinates guard execution and variant selection.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>}
 * Express-compatible request handler.
 */
export function createHandleAssignModerationJobCore(assignModerationWorkflow) {
  return async function handleAssignModerationJob(req, res) {
    const { status, body } = await assignModerationWorkflow({ req });

    res.status(status).send(body ?? '');
  };
}

/**
 * @typedef {object} AssignModerationWorkflowDeps
 * @property {(context: { req: NativeHttpRequest }) => Promise<{ error?: GuardError, context?: GuardContext }>} runGuards - Guard runner that validates the incoming request.
 * @property {(randomValue: number) => Promise<VariantSnapshot>} fetchVariantSnapshot - Resolver that fetches a moderation candidate snapshot.
 * @property {(snapshot: VariantSnapshot) => SelectVariantDocResult} selectVariantDoc - Selector that extracts the chosen variant document from a snapshot.
 * @property {(uid: string) => import('firebase-admin/firestore').DocumentReference} createModeratorRef - Factory that returns the moderator document reference for persisting assignments.
 * @property {() => unknown} now - Clock function that returns the timestamp persisted with the assignment.
 * @property {() => number} random - RNG used to seed variant selection.
 */

/**
 * @typedef {{ req: NativeHttpRequest }} AssignModerationWorkflowInput
 */

/**
 * Create the moderation assignment workflow.
 * @param {AssignModerationWorkflowDeps} deps Dependencies required by the workflow.
 * @returns {(input: AssignModerationWorkflowInput) => Promise<{ status: number, body?: string }>} Moderation assignment workflow.
 */
export function createAssignModerationWorkflow({
  runGuards,
  fetchVariantSnapshot,
  selectVariantDoc,
  createModeratorRef,
  now,
  random,
}) {
  return async function assignModerationWorkflow({ req }) {
    try {
      const context = await resolveGuardContext(runGuards, req);
      const userRecord = resolveUserRecord(context);
      const variantDoc = await resolveVariantDoc({
        fetchVariantSnapshot,
        selectVariantDoc,
        random,
      });

      await persistAssignment(
        { createModeratorRef, now },
        { userRecord, variantDoc }
      );

      return { status: 201, body: '' };
    } catch (err) {
      return handleAssignmentError(err);
    }
  };
}

/**
 * @typedef {object} AssignmentResponse
 * @property {number} status HTTP status code.
 * @property {string} [body] Response body.
 */

/**
 * Resolve assignment errors.
 * @param {unknown} err Error thrown during assignment.
 * @returns {AssignmentResponse | never} Summary response when the error is a response; otherwise rethrows.
 */
function handleAssignmentError(err) {
  if (isResponse(err)) {
    return /** @type {AssignmentResponse} */ (err);
  }

  throw err;
}

/**
 * Create guard error response.
 * @param {GuardError} error Error.
 * @returns {object} Response.
 */
function createGuardErrorResponse(error) {
  return {
    status: error.status,
    body: error.body,
  };
}

/**
 * Ensure guard result has no error or throw.
 * @param {(context: { req: NativeHttpRequest }) => Promise<{ error?: GuardError, context?: GuardContext }>} runGuards Guards runner.
 * @param {NativeHttpRequest} req Request.
 * @returns {Promise<GuardContext>} Guard context.
 */
async function resolveGuardContext(runGuards, req) {
  const guardResult = await runGuards({ req });
  return extractGuardContext(guardResult, req);
}

/**
 * Ensure a guard context is available or throw the associated response.
 * @param {{ error?: GuardError, context?: GuardContext } | undefined} guardResult Guard runner output.
 * @param {NativeHttpRequest} req Request used to seed fallback context.
 * @returns {GuardContext} Guard context.
 */
function extractGuardContext(guardResult, req) {
  ensureGuardErrorFromResult(guardResult);
  return getGuardContextValue(guardResult, req);
}

/**
 * Ensure the guard result exposes no errors.
 * @param {GuardResult | undefined} guardResult Guard runner output.
 * @returns {void}
 */
function ensureGuardErrorFromResult(guardResult) {
  ensureGuardError(guardResult?.error);
}

/**
 * Retrieve the guard context when available.
 * @param {GuardResult | undefined} guardResult Guard runner output.
 * @param {NativeHttpRequest} req Request used to compose the fallback context.
 * @returns {GuardContext} Guard context or fallback.
 */
function getGuardContextValue(guardResult, req) {
  return getContextOrFallback(guardResult?.context, req);
}

/**
 * Provide the guard context or a fallback containing the request.
 * @param {GuardContext | undefined} context Guard context candidate.
 * @param {NativeHttpRequest} req Request used to seed fallback context.
 * @returns {GuardContext} Guard context or safe fallback.
 */
function getContextOrFallback(context, req) {
  return context ?? { req };
}

/**
 * Throw when the guard runner produced an error.
 * @param {GuardError | undefined} guardError Guard error response.
 * @returns {void}
 */
function ensureGuardError(guardError) {
  if (guardError) {
    throw createGuardErrorResponse(guardError);
  }
}

/**
 * @typedef {object} UserRecordWithUid
 * @property {string} uid User ID.
 */

/**
 * Validate user record or throw.
 * @param {object} userRecord User record.
 * @returns {UserRecordWithUid} Validated record with UID.
 */
function requireUserRecord(userRecord) {
  if (!isValidUserRecord(userRecord)) {
    throw { status: 500, body: 'Moderator lookup failed' };
  }

  return userRecord;
}

/**
 * Determine whether the user record contains a UID.
 * @param {{ uid?: string } | undefined} userRecord Candidate user record.
 * @returns {userRecord is { uid: string }} True when the record exposes a UID.
 */
function isValidUserRecord(userRecord) {
  return Boolean(userRecord && userRecord.uid);
}

/**
 * Resolve user record from guard context.
 * @param {{ userRecord?: { uid?: string } }} context Context.
 * @returns {UserRecordWithUid} User record.
 */
function resolveUserRecord(context) {
  const userRecord = context?.userRecord ?? {};
  return requireUserRecord(userRecord);
}

/**
 * @typedef {object} ResolveVariantDocDeps
 * @property {(randomValue: number) => Promise<VariantSnapshot>} fetchVariantSnapshot Function that loads a variant snapshot based on the provided candidate.
 * @property {(snapshot: VariantSnapshot) => SelectVariantDocResult} selectVariantDoc Selector that extracts the variant document or an error message from the snapshot.
 * @property {() => number} random Random number generator used to pick a variant candidate.
 */

/**
 * Fetch a candidate variant snapshot and resolve the selected variant document.
 * @param {ResolveVariantDocDeps} deps Dependencies required for variant resolution.
 * @returns {Promise<VariantDocSnapshot>} Variant document snapshot resolved for the current moderator.
 * @throws {AssignmentResponse} When variant document cannot be resolved.
 */
async function resolveVariantDoc({
  fetchVariantSnapshot,
  selectVariantDoc,
  random,
}) {
  const variantSnapshot = await fetchVariantSnapshot(random());
  const { errorMessage, variantDoc } = selectVariantDoc(variantSnapshot);

  ensureVariantDocAvailability(errorMessage, variantDoc);

  return /** @type {VariantDocSnapshot} */ (variantDoc);
}

/**
 * Throw when error message is present.
 * @param {string | undefined} errorMessage - Error message.
 */
function throwIfErrorMessage(errorMessage) {
  if (errorMessage) {
    throw { status: 500, body: errorMessage };
  }
}

/**
 * Throw an error when the resolved variant doc is missing or the selector signaled a failure.
 * @param {string | undefined} errorMessage Optional selector error message.
 * @param {VariantDocSnapshot | undefined} variantDoc Variant document snapshot.
 * @returns {void}
 */
function ensureVariantDocAvailability(errorMessage, variantDoc) {
  throwIfErrorMessage(errorMessage);

  if (!variantDoc) {
    throw { status: 500, body: 'Variant fetch failed 🤷' };
  }
}

/**
 * @typedef {object} PersistAssignmentDeps
 * @property {(uid: string) => import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} createModeratorRef Factory returning moderator document references.
 * @property {() => unknown} now Clock used for timestamping assignments.
 */

/**
 * @typedef {object} PersistAssignmentData
 * @property {{ uid: string }} userRecord Authenticated moderator record.
 * @property {VariantDocSnapshot} variantDoc Selected variant document snapshot.
 */

/**
 * Persist assignment.
 * @param {PersistAssignmentDeps} deps Dependencies.
 * @param {PersistAssignmentData} data Data.
 * @returns {Promise<void>} Promise.
 */
async function persistAssignment(deps, data) {
  const { createModeratorRef, now } = deps;
  const { userRecord, variantDoc } = data;
  const moderatorRef = createModeratorRef(userRecord.uid);
  const createdAt = now();
  await /** @type {any} */ (moderatorRef).set({
    variant: /** @type {any} */ (variantDoc).ref,
    createdAt,
  });
}

/**
 * Check if value is a valid object.
 * @param {unknown} value - Value to check.
 * @returns {boolean} True if value is an object.
 */
function isValidObject(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Determine if value is a response object.
 * @param {unknown} value Value.
 * @returns {boolean} True if response.
 */
function isResponse(value) {
  if (!isValidObject(value)) {
    return false;
  }
  const obj = /** @type {any} */ (value);
  return typeof obj.status === 'number';
}

/**
 * Create the Express handler that assigns moderation jobs using Firestore.
 * @param {{
 *   createRunVariantQuery: (db: import('firebase-admin/firestore').Firestore) => (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>,
 *   auth: import('firebase-admin/auth').Auth,
 *   db: import('firebase-admin/firestore').Firestore,
 *   now: () => unknown,
 *   random: () => number,
 * }} options - Dependencies used to compose the handler.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Express handler that assigns a moderation job to the caller.
 */
export function createHandleAssignModerationJob({
  createRunVariantQuery,
  auth,
  db,
  now,
  random,
}) {
  const createFetchVariantSnapshotFromDb =
    createFetchVariantSnapshotFromDbFactory(createRunVariantQuery);

  const fetchVariantSnapshot = createFetchVariantSnapshotFromDb(db);

  return createHandleAssignModerationJobFromAuth({
    auth,
    fetchVariantSnapshot,
    db,
    now,
    random,
  });
}

/**
 * Register the assign moderation job route on the provided Express app.
 * @param {{ db: import('firebase-admin/firestore').Firestore, auth: import('firebase-admin/auth').Auth, app: NativeExpressApp }} firebaseResources - Firebase resources used to serve the moderation endpoint.
 * @param {(db: import('firebase-admin/firestore').Firestore) => (descriptor: VariantQueryDescriptor) => Promise<VariantSnapshot>} createRunVariantQuery - Factory that produces query executors bound to a Firestore database.
 * @param {() => unknown} now - Timestamp provider for persisted assignments.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Registered moderation handler.
 */
export function setupAssignModerationJobRoute(
  firebaseResources,
  createRunVariantQuery,
  now
) {
  const { db, auth, app } = firebaseResources;

  const handleAssignModerationJob = createHandleAssignModerationJob({
    createRunVariantQuery,
    auth,
    db,
    now,
    random,
  });

  app.post('/', handleAssignModerationJob);

  return handleAssignModerationJob;
}

/**
 * Create the Cloud Function that serves the assign moderation job endpoint.
 * @param {{ region: (region: string) => { https: { onRequest: (app: NativeExpressApp) => unknown } } }} functionsModule - Firebase functions module used to register the HTTP endpoint.
 * @param {{ app: NativeExpressApp }} firebaseResources - Express app configured for the moderation route.
 * @returns {unknown} Cloud Function handler that can be deployed.
 */
export function createAssignModerationJob(functionsModule, firebaseResources) {
  const { app } = firebaseResources;

  return functionsModule.region('europe-west1').https.onRequest(app);
}

/**
 * Compose the moderation handler using Firebase auth and Firestore dependencies.
 * @param {{
 *   auth: import('firebase-admin/auth').Auth,
 *   fetchVariantSnapshot: (randomValue: number) => Promise<VariantSnapshot>,
 *   db: import('firebase-admin/firestore').Firestore,
 *   now: () => unknown,
 *   random: () => number,
 * }} options - Dependencies for the handler.
 * @returns {(req: NativeHttpRequest, res: NativeHttpResponse) => Promise<void>} Express handler bound to Firebase auth.
 */
export function createHandleAssignModerationJobFromAuth({
  auth,
  fetchVariantSnapshot,
  db,
  now,
  random,
}) {
  const runGuards = createRunGuards(auth);
  const createModeratorRef = createModeratorRefFactory(db);

  const assignModerationWorkflow = createAssignModerationWorkflow({
    runGuards,
    fetchVariantSnapshot,
    selectVariantDoc,
    createModeratorRef,
    now,
    random,
  });

  return createHandleAssignModerationJobCore(assignModerationWorkflow);
}
