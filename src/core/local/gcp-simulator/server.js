import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createJsonExpressApp,
  createJsonExpressAppDeps,
} from '../../express-app.js';
import { createLocalGcpSimulator } from './simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultPublicDir = path.resolve(__dirname, '../../../../public');
const port = Number.parseInt(process.env.GCP_SIMULATOR_PORT ?? '8080', 10);
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

/**
 * @param {'get' | 'post'} method HTTP method.
 * @param {string} routePath Express route path.
 * @param {string} routeName Simulator route name.
 * @param {boolean} includeBody Whether to pass req.body to the route.
 * @returns {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }} Route descriptor.
 */
function createSimulatorRoute(method, routePath, routeName, includeBody) {
  return {
    method,
    path: routePath,
    routeName,
    includeBody,
  };
}

/**
 * @param {string} routePath Express route path.
 * @param {string} routeName Simulator route name.
 * @returns {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }} Route descriptor.
 */
function createGetRoute(routePath, routeName) {
  return createSimulatorRoute('get', routePath, routeName, false);
}

/**
 * @param {string} routePath Express route path.
 * @param {string} routeName Simulator route name.
 * @param {boolean} [includeBody] Whether to pass req.body to the route.
 * @returns {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }} Route descriptor.
 */
function createPostRoute(routePath, routeName, includeBody = true) {
  return createSimulatorRoute('post', routePath, routeName, includeBody);
}

/** @type {{ method: 'get' | 'post', path: string, routeName: string, includeBody: boolean }[]} */
const SIMULATOR_ROUTES = [
  createPostRoute('/__sim/submit-new-story', 'submitNewStory'),
  createPostRoute('/__sim/submit-new-page', 'submitNewPage'),
  createGetRoute('/api-keys/:uuid/credit', 'getApiKeyCreditV2'),
  createGetRoute('/api-keys/:uuid/credit/events', 'getApiKeyCreditV2'),
  createPostRoute('/api-keys/:uuid/credit', 'getApiKeyCreditV2'),
  createGetRoute('/__sim/get-moderation-variant', 'getModerationVariant'),
  createPostRoute('/__sim/assign-moderation-job', 'assignModerationJob'),
  createPostRoute('/__sim/submit-moderation-rating', 'submitModerationRating'),
  createPostRoute(
    '/__sim/trigger-render-contents',
    'triggerRenderContents',
    false
  ),
  createPostRoute('/__sim/mark-variant-dirty', 'markVariantDirty'),
  createPostRoute('/__sim/generate-stats', 'generateStats', false),
  createPostRoute('/__sim/payment-webhook', 'paymentWebhook'),
];

export const handle = startServer;

/**
 * Start the local simulator server.
 * @param {{ express: any }} deps Runtime dependencies.
 * @returns {Promise<import('node:http').Server>} Server instance.
 */
async function startServer(deps) {
  const express = /** @type {any} */ (deps.express);
  const simulator = /** @type {LocalGcpSimulator} */ (
    await getSimulatorPromise()
  );
  const app = createJsonExpressApp(createJsonExpressAppDeps(express));
  app.use((_req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/config.json', (_req, res) => {
    res.json(simulator.getConfig());
  });

  app.get('/seed.json', (_req, res) => {
    res.json(simulator.getSeedManifest());
  });

  app.get('/new-story.html', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        createNewStoryPage(
          /** @type {{ submitNewStoryUrl: string }} */ (simulator.getConfig())
        )
      );
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
    const result = await handler(buildSimulatorRequest(req, route));
    if (
      route.routeName === 'submitNewStory' &&
      shouldRedirectSubmitStory(req, result)
    ) {
      res.redirect(303, '/index.html');
      return;
    }
    await sendRouteResponse(Promise.resolve(result), res);
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
    path: req.path,
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
 * Determine whether a story submit should redirect like a browser form post.
 * @param {import('express').Request} req Express request.
 * @param {{ status: number, body?: unknown }} result Route result.
 * @returns {boolean} True when the request should be redirected.
 */
function shouldRedirectSubmitStory(req, result) {
  const accept = String(req.get('accept') ?? '');
  return result.status === 201 && accept.includes('text/html');
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

/**
 * Create the simulator-hosted new story page.
 * @param {{ submitNewStoryUrl: string }} config Simulator config.
 * @returns {string} HTML page.
 */
function createNewStoryPage(config) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>New Story</title></head><body><header class="site-header"><a class="brand" href="/">Dendrite</a><nav aria-label="Primary" class="nav-inline"><a href="/new-story.html">New story</a><a href="/mod.html">Moderate</a><a href="/stats.html">Stats</a><a href="/about.html">About</a><a class="admin-link" href="/admin.html" style="display:none">Admin</a><div id="signinButton"></div><div id="signoutWrap" style="display:none"><a id="signoutLink" href="/signout">Sign out</a></div></nav><button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">Open menu</button></header><div id="mobile-menu" hidden aria-hidden="true"><h3>Write</h3><a href="/new-story.html">New story</a><h3>Moderation</h3><a href="/mod.html">Moderate</a><a href="/stats.html">Stats</a><h3>About</h3><a href="/about.html">About</a><h3>Account</h3><a class="admin-link" href="/admin.html" style="display:none">Admin</a><div id="signinButton"></div><div id="signoutWrap" style="display:none"><a id="signoutLink" href="/signout">Sign out</a></div></div><main><h1>New story</h1><form data-submit-handler-ready="false" method="post" action="${config.submitNewStoryUrl}"><label for="title">Title</label><input id="title" name="title"><label for="content">Content</label><textarea id="content" name="content"></textarea><label for="author">Author</label><input id="author" name="author"><label for="option0">Option 1</label><input id="option0" name="option0"><label for="option1">Option 2</label><input id="option1" name="option1"><label for="option2">Option 3</label><input id="option2" name="option2"><label for="option3">Option 4</label><input id="option3" name="option3"><button type="submit">Submit</button></form><script>(async()=>{const config=await fetch('/config.json').then(r=>r.json());const form=document.querySelector('form');if(!form||!config.submitNewStoryUrl)return;form.setAttribute('action',config.submitNewStoryUrl);form.addEventListener('submit',async event=>{event.preventDefault();const formData=new FormData(form);const response=await fetch(config.submitNewStoryUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(formData)});if(response.ok){window.location.assign('/index.html');}});form.dataset.submitHandlerReady='true';})().catch(()=>{});</script></main></body></html>`;
}
