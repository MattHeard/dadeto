import express from 'express';
import { fileURLToPath } from 'node:url';
import { handle as startServer } from '../../core/local/gcp-simulator/server.js';
import { createLocalGcpSimulator } from './simulator.js';

const handle = deps => startServer({ ...deps, createSimulator: createLocalGcpSimulator });
export { sendRouteResponse } from '../../core/local/gcp-simulator/server.js';

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void handle({ express });
}
