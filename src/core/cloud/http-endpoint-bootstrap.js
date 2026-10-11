/**
 * Build a small Cloud Functions HTTP endpoint from endpoint-owned pieces.
 *
 * Middleware, routing policy, and handler behavior remain the caller's
 * responsibility; this helper only performs the repeated Express/Functions
 * wiring.
 * @typedef {{ use: (middleware: unknown) => void, [method: string]: (path: string, handler: unknown) => void }} CloudHttpApp
 * @typedef {{ region: (region: string) => { https: { onRequest: (app: CloudHttpApp) => unknown } } }} CloudFunctions
 * @param {{
 *   express: () => CloudHttpApp,
 *   middleware: unknown[],
 *   route: { method: string, path: string, handler: unknown },
 *   functions: CloudFunctions,
 *   region?: string,
 * }} options Endpoint wiring supplied by the owning endpoint.
 * @returns {{ app: CloudHttpApp, handle: unknown }} The Express app and registered Cloud Function.
 */
export function createCloudHttpEndpoint(options) {
  const express = options.express;
  const middleware = options.middleware;
  const route = options.route;
  const functions = options.functions;
  const region = options.region === undefined ? 'europe-west1' : options.region;

  const app = express();
  for (const currentMiddleware of middleware) {
    app.use(currentMiddleware);
  }
  app[route.method](route.path, route.handler);
  const handle = functions.region(region).https.onRequest(app);
  return { app, handle };
}
