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
  getWriterUrl as coreGetWriterUrl,
  isWriterHttpsEnabled as coreIsWriterHttpsEnabled,
  isWriterRequestLogEnabled as coreIsWriterRequestLogEnabled,
  shouldSetResponseLocation as coreShouldSetResponseLocation,
} from '../core/local/server.js';
import { getNonCoreThinStatus } from '../core/local/non-core-thin/status.js';
import { renderNonCoreThinDashboard } from './non-core-thin/dashboard.js';

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

  if (deps.requestLogger) {
    app.use(createRequestLogger(deps.requestLogger));
  }

  app.use(
    express.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' })
  );
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
      res.json(await deps.store.moveActiveIndex(getMoveDirection(req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/writer/workflow/select', async (req, res, next) => {
    try {
      res.json(await deps.store.setActiveIndex(getNextIndex(req.body)));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/writer/document/:documentId', async (req, res, next) => {
    try {
      res.json(
        await deps.store.saveDocument(
          req.params.documentId,
          getDocumentContent(req.body)
        )
      );
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/realtime/call', async (req, res, next) => {
    try {
      const { sdpAnswer, location } = await deps.exchangeRealtimeCallSdp(
        req.body ?? ''
      );
      if (coreShouldSetResponseLocation(location)) {
        res.set('Location', location);
      }
      res.type('application/sdp').send(sdpAnswer);
    } catch (error) {
      next(error);
    }
  });

  app.get('/non-core-thin', (_req, res) => {
    res.type('html').send(
      deps.renderNonCoreThinDashboard(deps.getNonCoreThinStatus())
    );
  });

  app.get('/api/non-core-thin', (_req, res) => {
    res.json(deps.getNonCoreThinStatus());
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createWriterServer(
    createLocalApp({
      store,
      publicDir,
      writerDir,
      exchangeRealtimeCallSdp,
      getNonCoreThinStatus,
      renderNonCoreThinDashboard,
      requestLogger: isWriterRequestLogEnabled(process.env) ? console.log : undefined,
    })
  );
  const host = process.env.WRITER_HOST;

  if (host && host.trim()) {
    server.listen(port, host.trim(), () => {
      console.log(`writer server listening on ${getWriterUrl(port, process.env)}`);
      console.log(`non-core-thin dashboard: http://${host.trim()}:${port}/non-core-thin`);
    });
  } else {
    server.listen(port, () => {
      console.log(`writer server listening on ${getWriterUrl(port, process.env)}`);
      console.log('non-core-thin dashboard: set WRITER_HOST=0.0.0.0 to reach /non-core-thin from the LAN');
    });
  }

  server.on('error', error => {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      console.error(formatListenErrorMessage(port));

      process.exitCode = 1;
      return;
    }

    throw error;
  });
}
