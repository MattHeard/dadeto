/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Initialize Firebase Admin during startup composition.
 * @param {AllowEffects} permission Startup permission.
 * @param {() => unknown} initializeApp Firebase initializer.
 * @returns {unknown} Initialized app.
 */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}

/** Create permission-first adapters for deleting rendered Cloud Storage files. */
export function createHideVariantHtmlEffectAdapters() {
  return {
    deleteStorageFile: (
      allowEffects,
      storage,
      bucketName,
      path,
      config
    ) => {
      void allowEffects;
      return /** @type {{bucket: (name: string) => {file: (path: string) => {delete: (config: {ignoreNotFound: boolean}) => Promise<unknown>}}}} */ (
        storage
      )
        .bucket(bucketName)
        .file(path)
        .delete(config);
    },
  };
}
