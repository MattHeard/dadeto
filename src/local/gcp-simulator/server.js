import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSimulatorServer } from '../../core/local/gcp-simulator/server.js';
import { createLocalGcpSimulator } from './simulator.js';
import { bindStartupEffectBoundary } from '../allow-effects.js';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {import('../../../types/native-http').NativeExpressApp} app @param {unknown} middleware */
const useMiddleware = (permission, app, middleware) => {
  void permission;
  app.use(middleware);
};

const server = createSimulatorServer({
  join: path.join,
  port: Number.parseInt(process.env.GCP_SIMULATOR_PORT ?? '8080', 10),
  publicDir: fileURLToPath(new URL('../../../public', import.meta.url)),
  isBinary: value => Buffer.isBuffer(value) || value instanceof Uint8Array,
});
const handle = deps =>
  server.handle({
    ...deps,
    createSimulator: (_permission, options) => createLocalGcpSimulator(options),
    bindStartupEffectBoundary,
    useMiddleware,
    log: (_permission, message) => console.log(message),
  });
export const sendRouteResponse = server.sendRouteResponse;

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void handle({ express });
}
