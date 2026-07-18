import { createFirestoreDocumentOnWriteTrigger } from '../cloud-core.js';
import { createRenderAuthorHandler } from './render-author-core.js';

/**
 * Wire the author renderer Cloud Function.
 * @param {{ functions: any, Storage: any, FieldValue: any, getFirestoreInstance: Function }} deps Runtime dependencies.
 * @returns {{ renderAuthor: any }} Cloud Function exports.
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
      handler: change => renderAuthor(change),
    }),
  };
}
