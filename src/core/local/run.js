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
  const log = deps.consoleLog ?? console.log;
  const errorLog = deps.consoleError ?? console.error;

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
 *
 * @param host
 */
function normalizeHost(host) {
  if (!host) {
    return '';
  }

  return host.trim();
}

/**
 *
 * @param config
 * @param deps
 * @param log
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
 *
 * @param env
 * @param deps
 * @param log
 */
function getRequestLogger(env, deps, log) {
  if (!deps.isWriterRequestLogEnabled(env)) {
    return undefined;
  }

  return log;
}

/**
 *
 * @param root0
 * @param root0.server
 * @param root0.host
 * @param root0.port
 * @param root0.env
 * @param root0.deps
 * @param root0.log
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
 *
 * @param root0
 * @param root0.port
 * @param root0.deps
 * @param root0.errorLog
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
 *
 * @param error
 */
function isPermissionError(error) {
  if (!error?.code) {
    return false;
  }

  return error.code === 'EPERM' || error.code === 'EACCES';
}
