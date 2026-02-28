import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const writerDir = path.join(publicDir, 'writer');
const port = Number.parseInt(process.env.WRITER_PORT ?? '4321', 10);
const store = createDocumentStore();

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use('/writer', express.static(writerDir));

app.get('/api/writer/workflow', async (_req, res, next) => {
  try {
    res.json(await store.loadWorkflow());
  } catch (error) {
    next(error);
  }
});

app.post('/api/writer/workflow/move', async (req, res, next) => {
  try {
    const direction = req.body?.direction === 'left' ? -1 : 1;
    res.json(await store.moveActiveIndex(direction));
  } catch (error) {
    next(error);
  }
});

app.post('/api/writer/workflow/select', async (req, res, next) => {
  try {
    const nextIndex = Number.isInteger(req.body?.activeIndex)
      ? req.body.activeIndex
      : 1;
    res.json(await store.setActiveIndex(nextIndex));
  } catch (error) {
    next(error);
  }
});

app.put('/api/writer/document/:documentId', async (req, res, next) => {
  try {
    const content =
      typeof req.body?.content === 'string' ? req.body.content : '';
    res.json(await store.saveDocument(req.params.documentId, content));
  } catch (error) {
    next(error);
  }
});

app.get('/', (_req, res) => {
  res.redirect('/writer/');
});

app.use((error, _req, res, _next) => {
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Unknown server error',
  });
});

app.listen(port, () => {
  console.log(`writer server listening on http://localhost:${port}/writer/`);
});
