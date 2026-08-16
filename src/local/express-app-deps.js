/**
 * Adapt an Express module into the helpers required by createJsonExpressApp.
 * @param {typeof import('express')} express Express module.
 * @returns {{createApp: () => import('express').Express, json: typeof import('express').json, urlencoded: typeof import('express').urlencoded}} Express helper bundle.
 */
export function createJsonExpressAppDeps(express) {
  return {
    createApp: () => express(),
    json: express.json,
    urlencoded: express.urlencoded,
  };
}
