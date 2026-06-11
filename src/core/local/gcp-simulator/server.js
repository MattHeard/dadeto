import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalGcpSimulator } from './simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPublicDir = path.resolve(__dirname, '../../../../public');
const port = Number.parseInt(process.env.GCP_SIMULATOR_PORT ?? '4322', 10);
/** @type {Promise<any> | null} */
let simulatorPromise = null;

/**
 * @typedef {{
 *   routes: Record<string, Function>,
 *   getConfig: () => unknown,
 *   getSeedManifest: () => unknown,
 *   storageRoot: string,
 *   bucketName: string,
 *   publicDir: string,
 * }} LocalGcpSimulator
 */

/** @type {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }[]} */
const SIMULATOR_ROUTES = [
  {
    method: 'post',
    path: '/__sim/submit-new-story',
    routeName: 'submitNewStory',
    includeBody: true,
  },
  {
    method: 'post',
    path: '/__sim/submit-new-page',
    routeName: 'submitNewPage',
    includeBody: true,
  },
  {
    method: 'get',
    path: '/__sim/get-moderation-variant',
    routeName: 'getModerationVariant',
    includeBody: false,
  },
  {
    method: 'post',
    path: '/__sim/assign-moderation-job',
    routeName: 'assignModerationJob',
    includeBody: true,
  },
  {
    method: 'post',
    path: '/__sim/submit-moderation-rating',
    routeName: 'submitModerationRating',
    includeBody: true,
  },
  {
    method: 'post',
    path: '/__sim/trigger-render-contents',
    routeName: 'triggerRenderContents',
    includeBody: false,
  },
  {
    method: 'post',
    path: '/__sim/mark-variant-dirty',
    routeName: 'markVariantDirty',
    includeBody: true,
  },
  {
    method: 'post',
    path: '/__sim/generate-stats',
    routeName: 'generateStats',
    includeBody: false,
  },
];

export const handle = startServer;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

/**
 * Start the local simulator server.
 * @returns {Promise<import('node:http').Server>} Server instance.
 */
async function startServer() {
  const simulator = /** @type {LocalGcpSimulator} */ (
    await getSimulatorPromise()
  );
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

  for (const route of SIMULATOR_ROUTES) {
    registerSimulatorRoute(app, simulator, route);
  }

  app.use(
    express.static(path.join(simulator.storageRoot, simulator.bucketName))
  );
  app.use(express.static(simulator.publicDir));

  return new Promise(resolve => {
    const server = app.listen(port, () => {
      const address = server.address();
      let actualPort = port;
      if (address && typeof address === 'object') {
        actualPort = address.port;
      }
      console.log(`gcp simulator listening on http://127.0.0.1:${actualPort}`);
      resolve(server);
    });
  });
}

/**
 * Register one simulator route on the Express app.
 * @param {import('express').Express} app Express application.
 * @param {LocalGcpSimulator} simulator Local simulator.
 * @param {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }} route Route configuration.
 * @returns {void}
 */
function registerSimulatorRoute(app, simulator, route) {
  app[route.method](route.path, async (req, res) => {
    const handler = simulator.routes[route.routeName];
    await sendRouteResponse(handler(buildSimulatorRequest(req, route)), res);
  });
}

/**
 * Build a request object for a simulator route handler.
 * @param {import('express').Request} req Express request.
 * @param {{ includeBody: boolean }} route Route configuration.
 * @returns {{ method: string, body?: unknown, headers: import('node:http').IncomingHttpHeaders, get: (name: string) => string | undefined }} Simulator request object.
 */
function buildSimulatorRequest(req, route) {
  const request = {
    method: req.method,
    headers: req.headers,
    get: getRequestHeader(req),
  };

  if (route.includeBody) {
    return { ...request, body: req.body };
  }

  return request;
}

/**
 * Send a simulator route result to an Express response.
 * @param {Promise<{ status: number, body?: unknown }>} resultPromise Route result.
 * @param {import('express').Response} res Express response.
 */
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

export { sendRouteResponse };

/**
 * @param {import('express').Request} req Express request.
 * @returns {(name: string) => string | undefined} Request header getter.
 */
function getRequestHeader(req) {
  return name => req.get(name);
}

/**
 * Lazily create the simulator so module import stays cheap.
 * @returns {Promise<any>} Simulator instance.
 */
function getSimulatorPromise() {
  if (!simulatorPromise) {
    simulatorPromise = createLocalGcpSimulator({
      baseUrl: `http://127.0.0.1:${port}`,
      publicDir: defaultPublicDir,
    });
  }

  return /** @type {Promise<any>} */ (simulatorPromise);
}
