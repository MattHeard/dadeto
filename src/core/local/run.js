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

  function runLocalServer(config) {
    const { env, port } = config;
    const host = env.WRITER_HOST;
    const requestLogger = deps.isWriterRequestLogEnabled(env) ? log : undefined;
    const app = deps.createLocalApp({
      store: config.store,
      publicDir: config.publicDir,
      writerDir: config.writerDir,
      exchangeRealtimeCallSdp: config.exchangeRealtimeCallSdp,
      getNonCoreThinStatus: config.getNonCoreThinStatus,
      renderNonCoreThinDashboard: config.renderNonCoreThinDashboard,
      requestLogger,
    });
    const server = deps.createWriterServer(app, { env });

    if (host && host.trim()) {
      server.listen(port, host.trim(), () => {
        log(`writer server listening on ${deps.getWriterUrl(port, env)}`);
        log(`non-core-thin dashboard: http://${host.trim()}:${port}/non-core-thin`);
      });
    } else {
      server.listen(port, () => {
        log(`writer server listening on ${deps.getWriterUrl(port, env)}`);
        log('non-core-thin dashboard: set WRITER_HOST=0.0.0.0 to reach /non-core-thin from the LAN');
      });
    }

    server.on('error', error => {
      if (error?.code === 'EPERM' || error?.code === 'EACCES') {
        errorLog(deps.formatListenErrorMessage(port));
        process.exitCode = 1;
        return;
      }

      throw error;
    });
  }

  return { runLocalServer };
}
