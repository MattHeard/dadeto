/**
 * Build a small Cloud Functions HTTP endpoint from endpoint-owned pieces.
 *
 * Middleware, routing policy, and handler behavior remain the caller's
 * responsibility; this helper only performs the repeated Express/Functions
 * wiring.
 * @param {{
 *   express: () => { use: (middleware: unknown) => void } & Record<string, (path: string, handler: unknown) => void>,
 *   middleware: unknown[],
 *   route: { method: string, path: string, handler: unknown },
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   region?: string,
 * }} options Endpoint wiring supplied by the owning endpoint.
 * @returns {{ app: unknown, handle: unknown }} The Express app and registered Cloud Function.
 */
export function createCloudHttpEndpoint({
  express,
  middleware,
  route,
  functions,
  region = 'europe-west1',
}) {
  const app = express();
  for (const currentMiddleware of middleware) {
    app.use(currentMiddleware);
  }
  app[route.method](route.path, route.handler);
  const handle = functions.region(region).https.onRequest(app);
  return { app, handle };
}
