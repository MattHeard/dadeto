import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';
import { exchangeRealtimeCallSdp } from './openaiRealtimeCalls.js';
import { formatListenErrorMessage } from './serverMessages.js';
import {
  createLocalAppCore,
  getWriterUrl as coreGetWriterUrl,
  isWriterHttpsEnabled as coreIsWriterHttpsEnabled,
  isWriterRequestLogEnabled as coreIsWriterRequestLogEnabled,
  shouldSetResponseLocation as coreShouldSetResponseLocation,
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
  const app = express();
  return createLocalAppCore({
    app,
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
    shouldSetResponseLocation: coreShouldSetResponseLocation,
  }).app;
}

function isEnabledEnvValue(value) {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

export function createRequestLogger(requestLogger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      requestLogger(formatRequestLog(req, res, Date.now() - start));
    });
    next();
  };
}

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

export function getMoveDirection(body) {
  return body?.direction === 'left' ? -1 : 1;
}

export function getNextIndex(body) {
  return Number.isInteger(body?.activeIndex) ? body.activeIndex : 1;
}

export function getDocumentContent(body) {
  return typeof body?.content === 'string' ? body.content : '';
}

function requireTlsPath(value, name) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw new Error(`${name} is required when WRITER_HTTPS is enabled.`);
}

export function readWriterTlsOptions(
  env,
  readFile = fs.readFileSync
) {
  const keyPath = requireTlsPath(env.WRITER_TLS_KEY, 'WRITER_TLS_KEY');
  const certPath = requireTlsPath(env.WRITER_TLS_CERT, 'WRITER_TLS_CERT');

  return {
    key: readFile(keyPath, 'utf8'),
    cert: readFile(certPath, 'utf8'),
  };
}

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

export function isWriterHttpsEnabled(env) {
  return coreIsWriterHttpsEnabled(env);
}

export function isWriterRequestLogEnabled(env) {
  return coreIsWriterRequestLogEnabled(env);
}

export function getWriterUrl(serverPort, env) {
  return coreGetWriterUrl(serverPort, env);
}


export const { runLocalServer } = createLocalServerRuntime({
  createLocalApp,
  createWriterServer,
  formatListenErrorMessage,
  getWriterUrl,
  isWriterRequestLogEnabled,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalServer({
    env: process.env,
    port,
    store,
    publicDir,
    writerDir,
    exchangeRealtimeCallSdp,
    getNonCoreThinStatus,
    renderNonCoreThinDashboard,
  });
}
