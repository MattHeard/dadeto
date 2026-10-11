/**
 * Adapt an Express module into the application factory and parser group used by createJsonExpressApp.
 * @param {typeof import('express')} express Express module.
 * @returns {{createApp: () => import('express').Express, parsers: {json: typeof import('express').json, urlencoded: typeof import('express').urlencoded}}} Express application and parser helpers.
 */
export function createJsonExpressAppDeps(express) {
  return {
    createApp: () => express(),
    parsers: {
      json: express.json,
      urlencoded: express.urlencoded,
    },
  };
}
