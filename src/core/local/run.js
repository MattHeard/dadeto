/**
 * Build the local writer runtime and startup handlers.
 * @param {{
 *   createLocalApp: (deps: unknown) => unknown,
 *   createWriterServer: (app: unknown, options?: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 *   formatListenErrorMessage: (port: number) => string,
 *   getWriterUrl: (port: number, env: Record<string, string | undefined>) => string,
 *   isWriterRequestLogEnabled: (env: Record<string, string | undefined>) => boolean,
 *   consoleLog?: (message: string) => void,
 *   consoleError?: (message: string) => void,
 * }} deps Runtime dependencies.
 * @returns {{ runLocalServer: (config: { env: Record<string, string | undefined>, port: number, store: unknown, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: (body: unknown) => Promise<unknown>, getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string }) => void }} Local server runner.
 */
export function createLocalServerRuntime(deps) {
  const { log, errorLog } = createLoggers(deps);

  /**
   * @param {{ env: Record<string, string | undefined>, port: number, store: unknown, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: (body: unknown) => Promise<unknown>, getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string }} config Runtime config.
   */
  function runLocalServer(config) {
    const { env, port } = config;
    const host = normalizeHost(env.WRITER_HOST);
    const app = deps.createLocalApp(buildLocalAppConfig(config, deps, log));
    const server = deps.createWriterServer(app, { env });

    startServer({ server, host, port, env, deps, log });
    server.on('error', createServerErrorHandler({ port, deps, errorLog }));
  }

  return { runLocalServer };
}

/**
 * @param {{
 *   consoleLog?: (message: string) => void,
 *   consoleError?: (message: string) => void
 * }} deps Runtime dependencies.
 * @returns {{ log: (message: string) => void, errorLog: (message: string) => void }} Normalized loggers.
 */
function createLoggers(deps) {
  return {
    log: resolveLogger(deps.consoleLog, console.log),
    errorLog: resolveLogger(deps.consoleError, console.error),
  };
}

/**
 * @param {string | undefined} host Raw host value.
 * @returns {string} Trimmed host or empty string.
 */
function normalizeHost(host) {
  if (!host) {
    return '';
  }

  return host.trim();
}

/**
 * @param {{ env: Record<string, string | undefined>, store: unknown, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: (body: unknown) => Promise<unknown>, getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string }} config Runtime config.
 * @param {{ isWriterRequestLogEnabled: (env: Record<string, string | undefined>) => boolean }} deps Runtime dependencies.
 * @param {(message: string) => void} log Request logger destination.
 * @returns {{ store: unknown, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: (body: unknown) => Promise<unknown>, getNonCoreThinStatus: () => unknown, renderNonCoreThinDashboard: (status: unknown) => string, requestLogger?: (message: string) => void }} Local app config.
 */
function buildLocalAppConfig(config, deps, log) {
  return {
    store: config.store,
    publicDir: config.publicDir,
    writerDir: config.writerDir,
    exchangeRealtimeCallSdp: config.exchangeRealtimeCallSdp,
    getNonCoreThinStatus: config.getNonCoreThinStatus,
    renderNonCoreThinDashboard: config.renderNonCoreThinDashboard,
    requestLogger: getRequestLogger(config.env, deps, log),
  };
}

/**
 * @param {Record<string, string | undefined>} env Runtime environment variables.
 * @param {{ isWriterRequestLogEnabled: (env: Record<string, string | undefined>) => boolean }} deps Runtime dependencies.
 * @param {(message: string) => void} log Request logger destination.
 * @returns {((message: string) => void) | undefined} Request logger when enabled.
 */
function getRequestLogger(env, deps, log) {
  if (!deps.isWriterRequestLogEnabled(env)) {
    return undefined;
  }

  return log;
}

/**
 * @param {{
 *   server: { listen: (...args: Array<unknown>) => void },
 *   host: string,
 *   port: number,
 *   env: Record<string, string | undefined>,
 *   deps: { getWriterUrl: (port: number, env: Record<string, string | undefined>) => string },
 *   log: (message: string) => void
 * }} options Server startup options.
 * @returns {void} Nothing.
 */
function startServer({ server, host, port, env, deps, log }) {
  const writerUrl = deps.getWriterUrl(port, env);
  if (host) {
    server.listen(port, host, () => {
      log(`writer server listening on ${writerUrl}`);
      log(`non-core-thin dashboard: http://${host}:${port}/non-core-thin`);
    });
    return;
  }

  server.listen(port, () => {
    log(`writer server listening on ${writerUrl}`);
    log(
      'non-core-thin dashboard: set WRITER_HOST=0.0.0.0 to reach /non-core-thin from the LAN'
    );
  });
}

/**
 * @param {{
 *   port: number,
 *   deps: { formatListenErrorMessage: (port: number) => string },
 *   errorLog: (message: string) => void
 * }} options Error handler dependencies.
 * @returns {(error: unknown) => void} Server error callback.
 */
function createServerErrorHandler({ port, deps, errorLog }) {
  return error => {
    if (!isPermissionError(error)) {
      throw error;
    }

    errorLog(deps.formatListenErrorMessage(port));
    process.exitCode = 1;
  };
}

/**
 * @param {unknown} error Candidate server listen error.
 * @returns {boolean} True when the error is a permission issue.
 */
function isPermissionError(error) {
  const errorCode = getErrorCode(error);
  return errorCode === 'EPERM' || errorCode === 'EACCES';
}

/**
 * @param {unknown} error Candidate server listen error.
 * @returns {string | null} Error code or null.
 */
function getErrorCode(error) {
  if (!isObjectLike(error)) {
    return null;
  }

  return getObjectErrorCode(error);
}

/**
 * @param {Record<string, unknown>} error Candidate server listen error object.
 * @returns {string | null} Error code or null.
 */
function getObjectErrorCode(error) {
  if (!('code' in error)) {
    return null;
  }

  return asNullableString(error.code);
}

/**
 * @param {((message: string) => void) | undefined} candidate Logger candidate.
 * @param {(message: string) => void} fallback Logger fallback.
 * @returns {(message: string) => void} Resolved logger.
 */
function resolveLogger(candidate, fallback) {
  return candidate || fallback;
}

/**
 * @param {unknown} value Candidate object.
 * @returns {value is Record<string, unknown>} True when the value is an object record.
 */
function isObjectLike(value) {
  return typeof value === 'object' && Boolean(value);
}

/**
 * @param {unknown} value Candidate string.
 * @returns {string | null} String or null.
 */
function asNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  return value;
}
