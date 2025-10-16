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
 * @param {(appInstance: import('express').Express, allowedOrigins: string[]) => void} configureCors
 * Function that configures CORS for the Express app.
 * @param {string[]} allowedOrigins Origins permitted to access the endpoint.
 * @param {(appInstance: import('express').Express) => void} [configureApp]
 * Optional callback invoked with the Express app for additional configuration.
 * @returns {{ db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth, app: import('express').Express }} Initialized dependencies.
 */
export function createAssignModerationApp(
  initializeFirebaseApp,
  configureCors,
  allowedOrigins,
  configureApp = () => {}
) {
  const { db, auth, app } = initializeFirebaseApp();
  configureCors(app, allowedOrigins);
  configureApp(app);

  return { db, auth, app };
}

/**
 * Build the CORS middleware options for the moderation app.
 * @param {(allowedOrigins: string[]) => (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void} createCorsOriginHandlerFn
 * Factory that produces the origin callback for the CORS middleware.
 * @param {string[]} allowedOrigins Origins permitted to call the endpoint.
 * @returns {{ origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void, methods: string[] }}
 * Configuration object for the CORS middleware.
 */
export function createCorsOptions(createCorsOriginHandlerFn, allowedOrigins) {
  return {
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
 * @returns {(appInstance: import('express').Express, allowedOrigins: string[]) => void}
 * Function that applies the configured CORS middleware to the Express app.
 */
export function createSetupCors(createCorsOriginHandlerFn, corsFn) {
  return function setupCors(appInstance, allowedOrigins) {
    const corsOptions = createCorsOptions(
      createCorsOriginHandlerFn,
      allowedOrigins
    );

    appInstance.use(corsFn(corsOptions));
  };
}

/**
 * Preconfigure the setupCors helper with the default origin handler.
 * @param {(createCorsOriginHandlerFn: typeof createCorsOriginHandler, corsFn: unknown) =>
 *   (appInstance: import('express').Express, allowedOrigins: string[]) => void} createSetupCorsFn
 * Function that builds the CORS setup callback.
 * @param {typeof createCorsOriginHandler} createCorsOriginHandlerFn Function creating the origin handler.
 * @returns {(corsFn: unknown) => (appInstance: import('express').Express, allowedOrigins: string[]) => void}
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
