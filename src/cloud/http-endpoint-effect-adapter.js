/**
 * Register an Express application as an HTTPS Cloud Function.
 * @param {import('../../types/allow-effects').AllowEffects} permission Startup command permission.
 * @param {{
 *   express: () => { use: (middleware: unknown) => void, [method: string]: (path: string, handler: unknown) => void },
 *   middleware: unknown[],
 *   route: { method: string, path: string, handler: unknown },
 *   functions: { region: (region: string) => { https: { onRequest: (app: unknown) => unknown } } },
 *   region?: string,
 * }} options Endpoint composition.
 * @returns {{ app: unknown, handle: unknown }} Registered endpoint values.
 */
export function registerHttpEndpoint(permission, options) {
  void permission;
  const app = options.express();
  for (const middleware of options.middleware) app.use(middleware);
  app[options.route.method](options.route.path, options.route.handler);
  const handle = options.functions
    .region(options.region ?? 'europe-west1')
    .https.onRequest(app);
  return { app, handle };
}
