// @ts-nocheck
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const ENABLED_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * Wire the local writer routes onto an app-like dependency.
 * @param {{
 *   app: {
 *     use: (middlewareOrPath: unknown, middleware?: unknown) => unknown,
 *     get: (path: string, handler: (...args: Array<unknown>) => unknown) => unknown,
 *     post: (path: string, handler: (...args: Array<unknown>) => unknown) => unknown,
 *     put: (path: string, handler: (...args: Array<unknown>) => unknown) => unknown,
 *   },
 *   requestLoggerMiddleware?: (req: unknown, res: unknown, next: (error?: unknown) => void) => void,
 *   static: (path: string) => unknown,
 *   text: (options: { type: string[], limit: string }) => unknown,
 *   json: (options: { limit: string }) => unknown,
 *   store: {
 *     loadWorkflow: () => Promise<unknown>,
 *     moveActiveIndex: (direction: number) => Promise<unknown>,
 *     setActiveIndex: (nextIndex: number) => Promise<unknown>,
 *     saveDocument: (documentId: string, content: string) => Promise<unknown>,
 *   },
 *   publicDir: string,
 *   writerDir: string,
 *   exchangeRealtimeCallSdp: (body: unknown) => Promise<{ sdpAnswer: string, location?: string }>,
 *   getNonCoreThinStatus: () => unknown,
 *   renderNonCoreThinDashboard: (status: unknown) => string,
 *   requestLogger?: (message: string) => void,
 *   getMoveDirection: (body: unknown) => number,
 *   getNextIndex: (body: unknown) => number,
 *   getDocumentContent: (body: unknown) => string,
 *   shouldSetResponseLocation: (location: string | undefined) => boolean,
 * }} deps Local server dependencies.
 * @returns {{ app: unknown }} The wired app reference.
 */
export function createLocalAppCore(deps) {
  const { app } = deps;

  if (deps.requestLoggerMiddleware) {
    app.use(deps.requestLoggerMiddleware);
  }

  app.use(
    deps.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' })
  );
  app.use(deps.json({ limit: '2mb' }));
  app.use('/writer', deps.static(deps.writerDir));

  app.get('/api/writer/workflow', handleAsyncRoute(deps.store.loadWorkflow));
  app.post(
    '/api/writer/workflow/move',
    handleAsyncRoute(req =>
      deps.store.moveActiveIndex(deps.getMoveDirection(req.body))
    )
  );
  app.post(
    '/api/writer/workflow/select',
    handleAsyncRoute(req =>
      deps.store.setActiveIndex(deps.getNextIndex(req.body))
    )
  );
  app.put(
    '/api/writer/document/:documentId',
    handleAsyncRoute(req =>
      deps.store.saveDocument(
        req.params.documentId,
        deps.getDocumentContent(req.body)
      )
    )
  );
  app.post(
    '/api/realtime/call',
    handleAsyncRoute(createRealtimeCallHandler(deps))
  );

  app.get('/non-core-thin', createDashboardRouteHandler(deps));

  app.get('/api/non-core-thin', createStatusRouteHandler(deps));

  app.get('/', createRootRedirectHandler());

  app.use(deps.static(deps.publicDir));

  return { app };
}

/**
 * Create middleware that records completed writer requests.
 * @param {(message: string) => void} requestLogger Request logger destination.
 * @returns {(req: { method?: string, originalUrl?: string, url?: string, ip?: string, socket?: { remoteAddress?: string } }, res: { on: (event: string, handler: () => void) => void }, next: () => void) => void} Request logger middleware.
 */
export function createRequestLogger(requestLogger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      requestLogger(formatRequestLog(req, res, Date.now() - start));
    });
    next();
  };
}

/**
 * Format a local writer request log line.
 * @param {{ method?: string, originalUrl?: string, url?: string, ip?: string, socket?: { remoteAddress?: string } }} req Request details.
 * @param {{ statusCode?: number }} res Response details.
 * @param {number} durationMs Request duration.
 * @returns {string} Writer request log line.
 */
function formatRequestLog(req, res, durationMs) {
  return [
    'writer request',
    req.method,
    req.originalUrl ?? req.url,
    res.statusCode,
    `${durationMs}ms`,
    req.ip ?? req.socket?.remoteAddress ?? 'unknown-remote',
  ].join(' ');
}

/**
 * Read the document move direction from a request body.
 * @param {{ direction?: string }} body Request body.
 * @returns {number} Move direction.
 */
export function getMoveDirection(body) {
  return body?.direction === 'left' ? -1 : 1;
}

/**
 * Read the next writer workflow index from a request body.
 * @param {{ activeIndex?: number }} body Request body.
 * @returns {number} Next index.
 */
export function getNextIndex(body) {
  return Number.isInteger(body?.activeIndex) ? body.activeIndex : 1;
}

/**
 * Read the document content from a request body.
 * @param {{ content?: unknown }} body Request body.
 * @returns {string} Document content.
 */
export function getDocumentContent(body) {
  return typeof body?.content === 'string' ? body.content : '';
}

/**
 * Determine whether a feature flag string is enabled.
 * @param {string | undefined} value Environment value.
 * @returns {boolean} True when the value enables the feature.
 */
function isEnabledEnvValue(value) {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

/**
 * Check whether local writer HTTPS mode is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when the writer server should use HTTPS.
 */
export function isWriterHttpsEnabled(env) {
  return isEnabledEnvValue(env?.WRITER_HTTPS);
}

/**
 * Check whether local writer request logging is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when request logging should be enabled.
 */
export function isWriterRequestLogEnabled(env) {
  return isEnabledEnvValue(env?.WRITER_REQUEST_LOG);
}

/**
 * Build the startup URL shown in local server logs.
 * @param {number} serverPort Port number.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {string} Writer app URL.
 */
export function getWriterUrl(serverPort, env) {
  const protocol = {
    true: 'https',
    false: 'http',
  }[String(isWriterHttpsEnabled(env))];
  return `${protocol}://localhost:${serverPort}/writer/`;
}

/**
 * Check whether a response Location header should be set.
 * @param {string | undefined} location Optional redirect location.
 * @returns {boolean} Whether the response should include Location.
 */
export function shouldSetResponseLocation(location) {
  return Boolean(location);
}

/**
 * Require a non-empty TLS path when HTTPS is enabled.
 * @param {string | undefined} value TLS path value.
 * @param {string} name Environment variable name.
 * @returns {string} Validated TLS path.
 */
function requireTlsPath(value, name) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw new Error(`${name} is required when WRITER_HTTPS is enabled.`);
}

/**
 * Read TLS key/certificate data for the writer server.
 * @param {Record<string, string | undefined>} env Environment variables.
 * @param {(filePath: string, encoding: 'utf8') => string} readFile File reader.
 * @returns {{ key: string, cert: string }} TLS options.
 */
export function readWriterTlsOptions(env, readFile) {
  const keyPath = requireTlsPath(env.WRITER_TLS_KEY, 'WRITER_TLS_KEY');
  const certPath = requireTlsPath(env.WRITER_TLS_CERT, 'WRITER_TLS_CERT');

  return {
    key: readFile(keyPath, 'utf8'),
    cert: readFile(certPath, 'utf8'),
  };
}

/**
 * Create the server that powers the local writer app.
 * @param {unknown} localApp Express application.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readFile?: (filePath: string, encoding: 'utf8') => string,
 *   httpCreateServer?: (app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 *   httpsCreateServer?: (options: { key: string, cert: string }, app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 * }} [options] Server options.
 * @returns {{ listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void }} Node server.
 */
export function createWriterServer(localApp, options = {}) {
  const {
    env,
    readFile = fs.readFileSync,
    httpCreateServer = http.createServer,
    httpsCreateServer = https.createServer,
  } = options;

  if (isWriterHttpsEnabled(env)) {
    return httpsCreateServer(readWriterTlsOptions(env, readFile), localApp);
  }

  return httpCreateServer(localApp);
}

/**
 * Wrap an async route handler and forward failures to next().
 * @param {(req: unknown, res: unknown, next: unknown) => Promise<void> | void} handler Route handler.
 * @returns {(req: unknown, res: unknown, next: (error: unknown) => void) => Promise<void>} Express route wrapper.
 */
function handleAsyncRoute(handler) {
  return async (req, res, next) => {
    await Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Build the realtime call handler for the local server.
 * @param {{
 *   exchangeRealtimeCallSdp: (body: unknown) => Promise<{ sdpAnswer: string, location?: string }>,
 *   shouldSetResponseLocation: (location: string | undefined) => boolean,
 * }} deps Local server dependencies.
 * @returns {(req: { body?: unknown }, res: { set: (name: string, value: string) => void, type: (type: string) => { send: (body: string) => void } }) => Promise<void>} Realtime route handler.
 */
function createRealtimeCallHandler(deps) {
  return async (req, res) => {
    const { sdpAnswer, location } = await deps.exchangeRealtimeCallSdp(
      req.body ?? ''
    );
    setResponseLocation(res, location, deps.shouldSetResponseLocation);
    res.type('application/sdp').send(sdpAnswer);
  };
}

/**
 * Set the response Location header when the realtime call returned one.
 * @param {{ set: (name: string, value: string) => void }} res Response object.
 * @param {string | undefined} location Optional redirect location.
 * @param {(location: string | undefined) => boolean} shouldSetResponseLocation Predicate for setting Location.
 * @returns {void} Nothing.
 */
function setResponseLocation(res, location, shouldSetResponseLocation) {
  if (shouldSetResponseLocation(location)) {
    res.set('Location', location);
  }
}

/**
 * Build the dashboard HTML route handler.
 * @param {{ getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string }} deps Local server dependencies.
 * @returns {(_req: unknown, res: { type: (type: string) => { send: (body: string) => void } }) => void} Dashboard route handler.
 */
function createDashboardRouteHandler(deps) {
  return (_req, res) => {
    res
      .type('html')
      .send(deps.renderNonCoreThinDashboard(deps.getNonCoreThinStatus()));
  };
}

/**
 * Build the status JSON route handler.
 * @param {{ getNonCoreThinStatus: () => unknown }} deps Local server dependencies.
 * @returns {(_req: unknown, res: { json: (body: unknown) => void }) => void} Status route handler.
 */
function createStatusRouteHandler(deps) {
  return (_req, res) => {
    res.json(deps.getNonCoreThinStatus());
  };
}

/**
 * Build the root redirect handler.
 * @returns {(_req: unknown, res: { redirect: (location: string) => void }) => void} Redirect route handler.
 */
function createRootRedirectHandler() {
  return (_req, res) => {
    res.redirect('/writer/');
  };
}
