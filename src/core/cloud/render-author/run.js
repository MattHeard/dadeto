import { createFirestoreDocumentOnWriteTrigger } from '../cloud-core.js';
import { createRenderAuthorHandler } from './render-author-core.js';

/** @typedef {{ region: (name: string) => unknown }} FunctionsLike */
/** @typedef {Record<string, unknown>} StorageLike */
/** @typedef {{ delete: () => unknown }} FieldValueLike */
/** @typedef {{ functions: FunctionsLike, Storage: StorageLike, FieldValue: FieldValueLike, getFirestoreInstance: () => unknown, saveAuthorHtml: typeof import('../../../cloud/render-author/effect-adapters.js').saveAuthorHtml, updateAuthorDocument: typeof import('../../../cloud/render-author/effect-adapters.js').updateAuthorDocument, bindEffectBoundary: typeof import('../../../cloud/render-author/render-author-gcf.js').bindEffectBoundary }} RenderAuthorDeps */

/**
 * Wire the author renderer Cloud Function.
 * @param {RenderAuthorDeps} deps Runtime dependencies.
 * @returns {{ renderAuthor: unknown }} Cloud Function exports.
 */
export function runRenderAuthor(deps) {
  // Stryker disable all -- author trigger wiring uses the fixed region/path/database contract.
  const functions = deps.functions;
  const Storage = deps.Storage;
  const FieldValue = deps.FieldValue;
  const getFirestoreInstance = deps.getFirestoreInstance;
  const saveAuthorHtml = deps.saveAuthorHtml;
  const updateAuthorDocument = deps.updateAuthorDocument;
  const bindEffectBoundary = deps.bindEffectBoundary;
  getFirestoreInstance();
  const bucket = /** @type {any} */ (
    new /** @type {any} */ (Storage)().bucket(process.env.STATIC_BUCKET_NAME)
  );
  const renderAuthor = createRenderAuthorHandler({
    db: /** @type {any} */ (getFirestoreInstance()),
    deleteField: () => FieldValue.delete(),
    saveAuthorHtml: (allowEffects, path, html) =>
      saveAuthorHtml(allowEffects, bucket, path, html),
    updateAuthorDocument,
  });
  return {
    renderAuthor: createFirestoreDocumentOnWriteTrigger(
      /** @type {any} */ ({
        functions,
        region: 'europe-west1',
        documentPath: 'authors/{authorId}',
        database: process.env.DATABASE_ID,
        handler: (/** @type {any} */ change) =>
          bindEffectBoundary(allowEffects =>
            renderAuthor(allowEffects, change)
          ),
      })
    ),
  };
  // Stryker restore all
}
