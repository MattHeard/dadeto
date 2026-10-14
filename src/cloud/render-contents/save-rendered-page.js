/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create the Cloud Storage write adapter for a contents renderer.
 * @param {unknown} storage Cloud Storage client.
 * @param {string} bucketName Destination bucket.
 * @returns {(permission: AllowEffects, path: string, content: string, options: object) => Promise<unknown>} Permission-aware storage writer.
 */
export function createSaveRenderedPage(storage, bucketName) {
  const storageClient = /** @type {{ bucket: (name: string) => { file: (path: string) => { save: (content: string, options: object) => Promise<unknown> } } }} */ (
    storage
  );
  return function saveRenderedPage(permission, path, content, options) {
    void permission;
    return storageClient.bucket(bucketName).file(path).save(content, options);
  };
}
