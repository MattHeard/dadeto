/**
 * Bind the stats HTML upload to Cloud Storage at the cloud boundary.
 * @param {import('@google-cloud/storage').Storage} storage Storage client.
 * @returns {(permission: import('../../../types/allow-effects').AllowEffects, bucketName: string, objectPath: string, html: string) => Promise<void>} Permission-aware upload adapter.
 */
export function createSaveStatsHtml(storage) {
  return async (permission, bucketName, objectPath, html) => {
    void permission;
    await storage.bucket(bucketName).file(objectPath).save(html, {
      contentType: 'text/html',
      metadata: { cacheControl: 'no-cache' },
    });
  };
}
