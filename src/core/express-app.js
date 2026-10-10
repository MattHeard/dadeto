/**
 * Create an Express app with the standard JSON and form parsers installed.
 * @param {{
 *   createApp: () => import('express').Express,
 *   json: typeof import('express').json,
 *   urlencoded: typeof import('express').urlencoded,
 *   bindStartupEffectBoundary: import('../../types/allow-effects').StartupAllowEffectsBoundary,
 *   useMiddleware: (permission: import('../../types/allow-effects').AllowEffects, app: import('../../types/native-http').NativeExpressApp, middleware: unknown) => void,
 * }} deps Express helpers.
 * @returns {import('express').Express} Express application.
 */
export function createJsonExpressApp({
  createApp,
  json,
  urlencoded,
  bindStartupEffectBoundary,
  useMiddleware,
}) {
  const app = createApp();
  const middlewares = [urlencoded({ extended: false }), json()];
  for (const middleware of middlewares) {
    bindStartupEffectBoundary(permission =>
      useMiddleware(permission, app, middleware)
    );
  }
  return app;
}

export { createJsonExpressAppDeps } from './local/express-app-deps.js';
