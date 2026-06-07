import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalGcpSimulator } from './simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPublicDir = path.resolve(__dirname, '../../../public');
const port = Number.parseInt(process.env.GCP_SIMULATOR_PORT ?? '4322', 10);

const simulatorPromise = createLocalGcpSimulator({
  baseUrl: `http://127.0.0.1:${port}`,
  publicDir: defaultPublicDir,
});

export const handle = startServer;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void startServer();
}

async function startServer() {
  const simulator = await simulatorPromise;
  const app = express();

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/config.json', (_req, res) => {
    res.json(simulator.getConfig());
  });

  app.get('/seed.json', (_req, res) => {
    res.json(simulator.getSeedManifest());
  });

  app.post('/__sim/submit-new-story', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.submitNewStory({
        method: req.method,
        body: req.body,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/submit-new-page', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.submitNewPage({
        method: req.method,
        body: req.body,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.get('/__sim/get-moderation-variant', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.getModerationVariant({
        method: req.method,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/assign-moderation-job', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.assignModerationJob({
        method: req.method,
        body: req.body,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/submit-moderation-rating', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.submitModerationRating({
        method: req.method,
        body: req.body,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/trigger-render-contents', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.triggerRenderContents({
        method: req.method,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/mark-variant-dirty', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.markVariantDirty({
        method: req.method,
        body: req.body,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.post('/__sim/generate-stats', async (req, res) => {
    await sendRouteResponse(
      simulator.routes.generateStats({
        method: req.method,
        headers: req.headers,
        get: name => req.get(name),
      }),
      res
    );
  });

  app.use(
    express.static(path.join(simulator.storageRoot, simulator.bucketName))
  );
  app.use(express.static(simulator.publicDir));

  return new Promise(resolve => {
    const server = app.listen(port, () => {
      console.log(`gcp simulator listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function sendRouteResponse(resultPromise, res) {
  const result = await resultPromise;
  if (result.status >= 400) {
    res.status(result.status);
    if (
      typeof result.body === 'string' ||
      Buffer.isBuffer(result.body) ||
      result.body instanceof Uint8Array
    ) {
      res.send(result.body);
      return;
    }
    res.json(result.body);
    return;
  }

  res.status(result.status || 200);
  if (result.body === undefined) {
    res.end();
    return;
  }

  res.json(result.body);
}

