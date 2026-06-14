/**
 * Create an Express app with the standard JSON and form parsers installed.
 * @param {{
 *   createApp: () => import('express').Express,
 *   json: typeof import('express').json,
 *   urlencoded: typeof import('express').urlencoded,
 * }} deps Express helpers.
 * @returns {import('express').Express} Express application.
 */
export function createJsonExpressApp({ createApp, json, urlencoded }) {
  const app = createApp();
  app.use(urlencoded({ extended: false }));
  app.use(json());
  return app;
}

/**
 * Adapt an Express module into the helpers required by createJsonExpressApp.
 * @param {typeof import('express')} express Express module.
 * @returns {{
 *   createApp: () => import('express').Express,
 *   json: typeof import('express').json,
 *   urlencoded: typeof import('express').urlencoded,
 * }} Express helper bundle.
 */
export function createJsonExpressAppDeps(express) {
  return {
    createApp: () => express(),
    json: express.json,
    urlencoded: express.urlencoded,
  };
}
