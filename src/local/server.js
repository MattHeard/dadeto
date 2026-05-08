import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';
import { exchangeRealtimeCallSdp } from './openaiRealtimeCalls.js';
import { formatListenErrorMessage } from './serverMessages.js';

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
 * @param {{store: ReturnType<typeof createDocumentStore>, publicDir: string, writerDir: string, exchangeRealtimeCallSdp: typeof exchangeRealtimeCallSdp}} deps
 *   Local server dependencies.
 * @returns {express.Express} Configured Express app.
 */
export function createLocalApp(deps) {
  const app = express();

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

export const app = createLocalApp({
  store,
  publicDir,
  writerDir,
  exchangeRealtimeCallSdp,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = app.listen(port, () => {
    console.log(`writer server listening on http://localhost:${port}/writer/`);
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
