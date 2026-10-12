/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../../types/allow-effects').EffectInvocationBoundary} EffectInvocationBoundary */

/** @typedef {{ use: (middleware: unknown) => void, post: (path: string, handler: Function) => void }} RealtimeCallApp */

/**
 * Compose the Realtime HTTP endpoint and its Cloud Function trigger.
 * @param {AllowEffects} startupPermission Permission for endpoint composition.
 * @param {{
 *   onRequest: (options: object, handler: RealtimeCallApp) => unknown,
 *   express: (() => RealtimeCallApp) & { text: (options: object) => unknown },
 *   cors: (options: object) => unknown,
 *   allowedOrigins: string[],
 *   exchangeRealtimeCallSdp: (body: string) => Promise<{sdpAnswer: string, location: string}>,
 *   bindRequestBoundary: EffectInvocationBoundary,
 *   useMiddleware: (permission: AllowEffects, app: RealtimeCallApp, middleware: unknown) => void,
 *   registerPostRoute: (permission: AllowEffects, app: RealtimeCallApp, path: string, handler: Function) => void,
 *   registerErrorHandler: (permission: AllowEffects, app: RealtimeCallApp, handler: (permission: AllowEffects, error: unknown, request: unknown, response: unknown) => void) => void,
 *   registerFunction: (permission: AllowEffects, onRequest: (options: object, handler: RealtimeCallApp) => unknown, app: RealtimeCallApp) => unknown,
 *   sendAnswer: (permission: AllowEffects, response: unknown, answer: string, location: string) => void,
 *   forwardError: (permission: AllowEffects, next: (error?: unknown) => unknown, error: unknown) => void,
 *   sendError: (permission: AllowEffects, response: unknown, error: unknown) => void,
 * }} dependencies Cloud runtime and permission-first effect adapters.
 * @returns {{app: RealtimeCallApp, handle: unknown}} Composed app and deployed function.
 */
export function createRealtimeCallRun(startupPermission, dependencies) {
  const app = dependencies.express();
  const corsMiddleware = dependencies.cors({
    origin: createCorsOriginResolver(dependencies.allowedOrigins),
    methods: ['POST', 'OPTIONS'],
  });
  dependencies.useMiddleware(startupPermission, app, corsMiddleware);
  dependencies.useMiddleware(
    startupPermission,
    app,
    dependencies.express.text({
      type: ['application/sdp', 'text/plain'],
      limit: '256kb',
    })
  );

  const requestHandler = dependencies.bindRequestBoundary(
    createRealtimeCallRequestHandler(dependencies)
  );
  dependencies.registerPostRoute(startupPermission, app, '/', requestHandler);

  /** @type {(permission: AllowEffects, error: unknown, request: unknown, response: unknown) => void} */
  const errorHandler = (permission, error, _request, response) =>
    dependencies.sendError(permission, response, error);
  dependencies.registerErrorHandler(startupPermission, app, errorHandler);

  return {
    app,
    handle: dependencies.registerFunction(
      startupPermission,
      dependencies.onRequest,
      app
    ),
  };
}

/**
 * @param {string[]} allowedOrigins Allowed browser origins.
 * @returns {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} CORS origin callback.
 */
function createCorsOriginResolver(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS'));
  };
}

/**
 * @param {Parameters<typeof createRealtimeCallRun>[1]} dependencies Runtime dependencies.
 * @returns {(permission: AllowEffects, request: {body?: unknown}, response: unknown, next: (error?: unknown) => unknown) => Promise<void>} Request-scoped handler.
 */
function createRealtimeCallRequestHandler(dependencies) {
  return async function handleRealtimeCallRequest(
    permission,
    request,
    response,
    next
  ) {
    try {
      const body = typeof request.body === 'string' ? request.body : '';
      const { sdpAnswer, location } =
        await dependencies.exchangeRealtimeCallSdp(body);
      dependencies.sendAnswer(permission, response, sdpAnswer, location);
    } catch (error) {
      dependencies.forwardError(permission, next, error);
    }
  };
}
