/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

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
