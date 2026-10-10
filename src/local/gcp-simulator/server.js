import express from 'express';
import { fileURLToPath } from 'node:url';
import { handle as startServer } from '../../core/local/gcp-simulator/server.js';
import { createLocalGcpSimulator } from './simulator.js';
import { bindStartupEffectBoundary } from '../allow-effects.js';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {import('../../../types/native-http').NativeExpressApp} app @param {unknown} middleware */
const useMiddleware = (permission, app, middleware) => {
  void permission;
  app.use(middleware);
};

const handle = deps =>
  startServer({
    ...deps,
    createSimulator: createLocalGcpSimulator,
    bindStartupEffectBoundary,
    useMiddleware,
  });
export { sendRouteResponse } from '../../core/local/gcp-simulator/server.js';

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void handle({ express });
}
