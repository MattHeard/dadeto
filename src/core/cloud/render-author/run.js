import { createFirestoreDocumentOnWriteTrigger } from '../cloud-core.js';
import { createRenderAuthorHandler } from './render-author-core.js';

/** @typedef {{ region: (name: string) => unknown }} FunctionsLike */
/** @typedef {Record<string, unknown>} StorageLike */
/** @typedef {{ delete: () => unknown }} FieldValueLike */
/** @typedef {{ functions: FunctionsLike, Storage: StorageLike, FieldValue: FieldValueLike, getFirestoreInstance: () => unknown }} RenderAuthorDeps */

/**
 * Wire the author renderer Cloud Function.
 * @param {RenderAuthorDeps} deps Runtime dependencies.
 * @returns {{ renderAuthor: unknown }} Cloud Function exports.
 */
export function runRenderAuthor(deps) {
  const { functions, Storage, FieldValue, getFirestoreInstance } = deps;
  getFirestoreInstance();
  const bucket = /** @type {any} */ (
    new /** @type {any} */ (Storage)().bucket(process.env.STATIC_BUCKET_NAME)
  );
  const renderAuthor = createRenderAuthorHandler({
    bucket,
    db: /** @type {any} */ (getFirestoreInstance()),
    deleteField: () => FieldValue.delete(),
  });
  return {
    renderAuthor: createFirestoreDocumentOnWriteTrigger(
      /** @type {any} */ ({
        functions,
        region: 'europe-west1',
        documentPath: 'authors/{authorId}',
        database: process.env.DATABASE_ID,
        handler: (/** @type {any} */ change) => renderAuthor(change),
      })
    ),
  };
}
