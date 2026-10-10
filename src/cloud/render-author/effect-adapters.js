/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Save rendered author HTML to object storage.
 * @param {AllowEffects} allowEffects Permission for the storage command.
 * @param {{ file: (path: string) => { save: (content: string, options: object) => Promise<unknown> } }} bucket Storage bucket.
 * @param {string} path Object path.
 * @param {string} html Rendered HTML content.
 * @returns {Promise<unknown>} Storage save result.
 */
export function saveAuthorHtml(allowEffects, bucket, path, html) {
  void allowEffects;
  return bucket.file(path).save(html, { contentType: 'text/html' });
}

/**
 * Update the author document after rendering.
 * @param {AllowEffects} allowEffects Permission for the Firestore command.
 * @param {{ update: (value: object) => Promise<unknown> }} reference Author document reference.
 * @param {object} value Update fields.
 * @returns {Promise<unknown>} Firestore update result.
 */
export function updateAuthorDocument(allowEffects, reference, value) {
  void allowEffects;
  return reference.update(value);
}
