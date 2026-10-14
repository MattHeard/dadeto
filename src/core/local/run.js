import { asNullableString, isObjectLike } from './notion-codex/valueHelpers.js';

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

    const writerUrl = deps.getWriterUrl(port, env);
    const onListening = createServerListeningHandler(
      host,
      port,
      writerUrl,
      log
    );
    startServer(server, host, port, onListening);
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
    log: resolveLogger(deps.consoleLog),
    errorLog: resolveLogger(deps.consoleError),
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
 * @param {{listen: (...args: Array<unknown>) => void}} server Server to start.
 * @param {string} host Normalized listen host.
 * @param {number} port Listen port.
 * @param {() => void} onListening Callback for successful startup.
 * @returns {void} Nothing.
 */
function startServer(server, host, port, onListening) {
  const listenArgs = host ? [port, host, onListening] : [port, onListening];
  server.listen(...listenArgs);
}

/**
 * Prepare the callback that logs the local server URLs after startup.
 * @param {string} host Normalized listen host.
 * @param {number} port Listen port.
 * @param {string} writerUrl Writer base URL.
 * @param {(message: string) => void} log Startup logger.
 * @returns {() => void} Callback for successful startup.
 */
function createServerListeningHandler(host, port, writerUrl, log) {
  return () => {
    log(`writer server listening on ${writerUrl}`);
    log(
      host
        ? `non-core-thin dashboard: http://${host}:${port}/non-core-thin`
        : 'non-core-thin dashboard: set WRITER_HOST=0.0.0.0 to reach /non-core-thin from the LAN'
    );
  };
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
export function getErrorCode(error) {
  let code = null;
  if (isObjectLike(error) && 'code' in error) {
    code = asNullableString(error.code);
  }
  return code;
}

/**
 * @param {((message: string) => void) | undefined} candidate Logger candidate.
 * @returns {(message: string) => void} Resolved logger.
 */
function resolveLogger(candidate) {
  return candidate || (() => {});
}
