import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocumentStore } from './documentStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const writerDir = path.join(publicDir, 'writer');
const port = Number.parseInt(process.env.WRITER_PORT ?? '4321', 10);
const store = createDocumentStore({
  documentPath: process.env.WRITER_DOCUMENT_PATH,
});

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use('/writer', express.static(writerDir));

app.get('/api/writer/document', async (_req, res, next) => {
  try {
    const content = await store.load();
    res.json({
      content,
      documentPath: store.documentPath,
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/writer/document', async (req, res, next) => {
  try {
    const content =
      typeof req.body?.content === 'string' ? req.body.content : '';
    const result = await store.save(content);
    res.json({
      ...result,
      documentPath: store.documentPath,
    });
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
