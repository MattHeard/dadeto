import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';
import { exchangeRealtimeCallSdp } from './openaiRealtimeCalls.js';
import { formatListenErrorMessage } from './serverMessages.js';

const ENABLED_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const writerDir = path.join(publicDir, 'writer');
const port = Number.parseInt(process.env.WRITER_PORT ?? '4321', 10);
const store = createDocumentStore({
  workflowPath: process.env.WRITER_WORKFLOW_PATH,
  legacyDocumentPath: process.env.WRITER_LEGACY_DOCUMENT_PATH,
});

/**
 * Create the local Dadeto Express app.
 * @param {{store: ReturnType<typeof createDocumentStore>, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: typeof exchangeRealtimeCallSdp, requestLogger?: (message: string) => void}} deps
 *   Local server dependencies.
 * @returns {express.Express} Configured Express app.
 */
export function createLocalApp(deps) {
  const app = express();

  if (deps.requestLogger) {
    app.use(createRequestLogger(deps.requestLogger));
  }

  app.use(express.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/writer', express.static(deps.writerDir));

  app.get('/api/writer/workflow', async (_req, res, next) => {
    try {
      res.json(await deps.store.loadWorkflow());
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/writer/workflow/move', async (req, res, next) => {
    try {
      const direction = req.body?.direction === 'left' ? -1 : 1;
      res.json(await deps.store.moveActiveIndex(direction));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/writer/workflow/select', async (req, res, next) => {
    try {
      const nextIndex = Number.isInteger(req.body?.activeIndex)
        ? req.body.activeIndex
        : 1;
      res.json(await deps.store.setActiveIndex(nextIndex));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/writer/document/:documentId', async (req, res, next) => {
    try {
      const content =
        typeof req.body?.content === 'string' ? req.body.content : '';
      res.json(await deps.store.saveDocument(req.params.documentId, content));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/realtime/call', async (req, res, next) => {
    try {
      const { sdpAnswer, location } = await deps.exchangeRealtimeCallSdp(
        req.body ?? ''
      );
      if (location) {
        res.set('Location', location);
      }
      res.type('application/sdp').send(sdpAnswer);
    } catch (error) {
      next(error);
    }
  });

  app.get('/', (_req, res) => {
    res.redirect('/writer/');
  });

  app.use(express.static(deps.publicDir));

  app.use((error, _req, res, _next) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  });

  return app;
}

/**
 * Check whether local writer HTTPS mode is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when the writer server should use HTTPS.
 */
export function isWriterHttpsEnabled(env = process.env) {
  return isEnabledEnvValue(env.WRITER_HTTPS);
}

/**
 * Check whether local writer request logging is enabled.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {boolean} True when request logging should be enabled.
 */
export function isWriterRequestLogEnabled(env = process.env) {
  return isEnabledEnvValue(env.WRITER_REQUEST_LOG);
}

/**
 * Check whether an environment value enables a local feature.
 * @param {string | undefined} value Environment value.
 * @returns {boolean} True when the value is an enabled flag.
 */
function isEnabledEnvValue(value) {
  return ENABLED_ENV_VALUES.has((value ?? '').trim().toLowerCase());
}

/**
 * Create local writer request logging middleware.
 * @param {(message: string) => void} requestLogger Request log sink.
 * @returns {express.RequestHandler} Express middleware.
 */
export function createRequestLogger(requestLogger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      requestLogger(formatRequestLog(req, res, Date.now() - start));
    });
    next();
  };
}

/**
 * Format a local writer request log line.
 * @param {express.Request} req Express request.
 * @param {express.Response} res Express response.
 * @param {number} durationMs Request duration in milliseconds.
 * @returns {string} Request log line.
 */
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

/**
 * Require a TLS path when HTTPS mode is active.
 * @param {string | undefined} value Candidate path.
 * @param {string} name Environment variable name.
 * @returns {string} Non-empty path.
 */
function requireTlsPath(value, name) {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  throw new Error(`${name} is required when WRITER_HTTPS is enabled.`);
}

/**
 * Read TLS key and certificate files for local HTTPS.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @param {(path: string, encoding: BufferEncoding) => string | Buffer} [readFile]
 *   File reader.
 * @returns {{key: string | Buffer, cert: string | Buffer}} HTTPS TLS options.
 */
export function readWriterTlsOptions(
  env = process.env,
  readFile = fs.readFileSync
) {
  const keyPath = requireTlsPath(env.WRITER_TLS_KEY, 'WRITER_TLS_KEY');
  const certPath = requireTlsPath(env.WRITER_TLS_CERT, 'WRITER_TLS_CERT');

  return {
    key: readFile(keyPath, 'utf8'),
    cert: readFile(certPath, 'utf8'),
  };
}

/**
 * Create the local writer HTTP or HTTPS server.
 * @param {express.Express} localApp Configured Express app.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readFile?: (path: string, encoding: BufferEncoding) => string | Buffer,
 *   httpCreateServer?: typeof http.createServer,
 *   httpsCreateServer?: typeof https.createServer,
 * }} [options] Injectable dependencies for tests.
 * @returns {http.Server | https.Server} Node server.
 */
export function createWriterServer(localApp, options = {}) {
  const {
    env = process.env,
    readFile = fs.readFileSync,
    httpCreateServer = http.createServer,
    httpsCreateServer = https.createServer,
  } = options;

  if (isWriterHttpsEnabled(env)) {
    return httpsCreateServer(readWriterTlsOptions(env, readFile), localApp);
  }

  return httpCreateServer(localApp);
}

/**
 * Build the startup URL shown in local server logs.
 * @param {number} serverPort Port number.
 * @param {Record<string, string | undefined>} [env] Environment variables.
 * @returns {string} Writer app URL.
 */
export function getWriterUrl(serverPort, env = process.env) {
  const protocol = isWriterHttpsEnabled(env) ? 'https' : 'http';
  return `${protocol}://localhost:${serverPort}/writer/`;
}

export const app = createLocalApp({
  store,
  publicDir,
  writerDir,
  exchangeRealtimeCallSdp,
  requestLogger: isWriterRequestLogEnabled() ? console.log : undefined,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createWriterServer(app);

  server.listen(port, () => {
    console.log(`writer server listening on ${getWriterUrl(port)}`);
  });

  server.on('error', error => {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      console.error(formatListenErrorMessage(port));

      process.exitCode = 1;
      return;
    }

    throw error;
  });
}
