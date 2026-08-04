import { createFirestoreDocumentOnWriteTrigger } from '../cloud-core.js';
import { createRenderAuthorHandler } from './render-author-core.js';

/**
 * Wire the author renderer Cloud Function.
 * @param {{ functions: unknown, Storage: { new (): { bucket: (name?: string) => unknown } }, FieldValue: { delete: () => unknown }, getFirestoreInstance: () => unknown }} deps Runtime dependencies.
 * @returns {{ renderAuthor: unknown }} Cloud Function exports.
 */
export function runRenderAuthor(deps) {
  const { functions, Storage, FieldValue, getFirestoreInstance } = deps;
  getFirestoreInstance();
  const bucket = new Storage().bucket(process.env.STATIC_BUCKET_NAME);
  const renderAuthor = createRenderAuthorHandler({
    bucket,
    db: getFirestoreInstance(),
    deleteField: () => FieldValue.delete(),
  });
  return {
    renderAuthor: createFirestoreDocumentOnWriteTrigger({
      functions,
      region: 'europe-west1',
      documentPath: 'authors/{authorId}',
      database: process.env.DATABASE_ID,
      handler: change => renderAuthor(change),
    }),
  };
}
