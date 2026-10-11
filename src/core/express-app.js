/** @typedef {{json: typeof import('express').json, urlencoded: typeof import('express').urlencoded}} JsonExpressParsers */

/**
 * Create an Express app with the standard JSON and form parsers installed.
 * @param {() => import('express').Express} createApp Express application factory.
 * @param {JsonExpressParsers} parsers JSON and form parser factories.
 * @param {import('../../types/allow-effects').StartupAllowEffectsBoundary} bindStartupEffectBoundary Startup middleware permission boundary.
 * @param {(permission: import('../../types/allow-effects').AllowEffects, app: import('../../types/native-http').NativeExpressApp, middleware: unknown) => void} useMiddleware Permission-bound middleware installer.
 * @returns {import('express').Express} Express application.
 */
export function createJsonExpressApp(
  createApp,
  parsers,
  bindStartupEffectBoundary,
  useMiddleware
) {
  const app = createApp();
  const middlewares = [parsers.urlencoded({ extended: false }), parsers.json()];
  for (const middleware of middlewares) {
    bindStartupEffectBoundary(permission =>
      useMiddleware(permission, app, middleware)
    );
  }
  return app;
}

export { createJsonExpressAppDeps } from './local/express-app-deps.js';
