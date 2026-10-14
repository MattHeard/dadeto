/**
 * Build a small Cloud Functions HTTP endpoint from endpoint-owned pieces.
 *
 * Middleware, routing policy, and handler behavior remain the caller's
 * responsibility; this helper only composes the repeated Express/Functions
 * wiring from permission-aware effect adapters.
 * @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects
 * @typedef {{ use: (middleware: unknown) => void, [method: string]: (path: string, handler: unknown) => void }} CloudHttpApp
 * @typedef {{ region: (region: string) => { https: { onRequest: (app: CloudHttpApp) => unknown } } }} CloudFunctions
 * @typedef {(permission: AllowEffects, app: CloudHttpApp, middleware: unknown) => unknown} UseMiddleware
 * @typedef {(permission: AllowEffects, app: CloudHttpApp, route: { method: string, path: string, handler: unknown }) => unknown} RegisterRoute
 * @typedef {(permission: AllowEffects, functions: CloudFunctions, app: CloudHttpApp, region: string) => unknown} RegisterEndpoint
 * @param {AllowEffects} allowEffects Startup command permission.
 * @param {{
 *   express: () => CloudHttpApp,
 *   middleware: unknown[],
 *   route: { method: string, path: string, handler: unknown },
 *   functions: CloudFunctions,
 *   region?: string,
 *   useMiddleware: UseMiddleware,
 *   registerRoute: RegisterRoute,
 *   registerEndpoint: RegisterEndpoint,
 * }} options Endpoint wiring supplied by the owning endpoint.
 * @returns {{ app: CloudHttpApp, handle: unknown }} The Express app and registered Cloud Function.
 */
export function createCloudHttpEndpoint(allowEffects, options) {
  const express = options.express;
  const middleware = options.middleware;
  const route = options.route;
  const functions = options.functions;
  const region = options.region === undefined ? 'europe-west1' : options.region;

  const app = express();
  for (const currentMiddleware of middleware) {
    options.useMiddleware(allowEffects, app, currentMiddleware);
  }
  options.registerRoute(allowEffects, app, route);
  const handle = options.registerEndpoint(allowEffects, functions, app, region);
  return { app, handle };
}
