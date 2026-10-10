/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Save a simulator Storage file through the local effects boundary.
 * @param {AllowEffects} allowEffects Request capability.
 * @param {object} file Storage file handle.
 * @param {string} contents File contents.
 * @param {object} options Storage save options.
 * @returns {Promise<unknown>} Storage save result.
 */
export function saveStorageFile(allowEffects, file, contents, options) {
  void allowEffects;
  return /** @type {{ save: (contents: string, options: object) => Promise<unknown> }} */ (
    file
  ).save(contents, options);
}

/** Register simulator middleware at its local runtime boundary. */
export function useMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}
