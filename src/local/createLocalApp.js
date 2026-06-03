import express from 'express';
import {
  createLocalAppCore,
  createRequestLogger,
  getDocumentContent,
  getMoveDirection,
  getNextIndex,
  shouldSetResponseLocation,
} from '../core/local/server.js';

/**
 * Build the local writer app with injected dependencies.
 * @param {{
 *   store: unknown,
 *   publicDir: string,
 *   writerDir: string,
 *   exchangeRealtimeCallSdp: (body: unknown) => Promise<unknown>,
 *   getNonCoreThinStatus: () => unknown,
 *   renderNonCoreThinDashboard: (status: unknown) => string,
 *   requestLogger?: (message: string) => void,
 * }} deps Local app dependencies.
 * @returns {unknown} Express app instance.
 */
export function createLocalApp(deps) {
  return createLocalAppCore({
    app: express(),
    requestLoggerMiddleware: deps.requestLogger
      ? createRequestLogger(deps.requestLogger)
      : undefined,
    static: express.static,
    text: express.text,
    json: express.json,
    store: deps.store,
    publicDir: deps.publicDir,
    writerDir: deps.writerDir,
    exchangeRealtimeCallSdp: deps.exchangeRealtimeCallSdp,
    getNonCoreThinStatus: deps.getNonCoreThinStatus,
    renderNonCoreThinDashboard: deps.renderNonCoreThinDashboard,
    requestLogger: deps.requestLogger,
    getMoveDirection,
    getNextIndex,
    getDocumentContent,
    shouldSetResponseLocation,
  }).app;
}
