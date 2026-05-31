import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';
import { exchangeRealtimeCallSdp } from './openaiRealtimeCalls.js';
import { formatListenErrorMessage } from './serverMessages.js';
import {
  createLocalAppCore,
  createRequestLogger,
  createWriterServer,
  getDocumentContent,
  getMoveDirection,
  getNextIndex,
  getWriterUrl,
  isWriterRequestLogEnabled,
  shouldSetResponseLocation,
} from '../core/local/server.js';
import { getNonCoreThinStatus } from '../core/local/non-core-thin/status.js';
import { renderNonCoreThinDashboard } from './non-core-thin/dashboard.js';
import { createLocalServerRuntime } from '../core/local/run.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const writerDir = path.join(publicDir, 'writer');
const port = Number.parseInt(process.env.WRITER_PORT ?? '4321', 10);
const store = createDocumentStore({
  workflowPath: process.env.WRITER_WORKFLOW_PATH,
  legacyDocumentPath: process.env.WRITER_LEGACY_DOCUMENT_PATH,
});

export function createLocalApp(deps) {
  return createLocalAppCore({ app: express(), requestLoggerMiddleware: deps.requestLogger ? createRequestLogger(deps.requestLogger) : undefined, static: express.static, text: express.text, json: express.json, store: deps.store, publicDir: deps.publicDir, writerDir: deps.writerDir, exchangeRealtimeCallSdp: deps.exchangeRealtimeCallSdp, getNonCoreThinStatus: deps.getNonCoreThinStatus, renderNonCoreThinDashboard: deps.renderNonCoreThinDashboard, requestLogger: deps.requestLogger, getMoveDirection, getNextIndex, getDocumentContent, shouldSetResponseLocation }).app;
}

export const { runLocalServer } = createLocalServerRuntime({ createLocalApp, createWriterServer, formatListenErrorMessage, getWriterUrl, isWriterRequestLogEnabled });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalServer({ env: process.env, port, store, publicDir, writerDir, exchangeRealtimeCallSdp, getNonCoreThinStatus, renderNonCoreThinDashboard });
}
