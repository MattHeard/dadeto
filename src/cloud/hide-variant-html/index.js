import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  Storage,
  createFirebaseAppManager,
} from './hide-variant-html-gcf.js';
import {
  VISIBILITY_THRESHOLD,
  buildVariantPath,
  createBucketFileRemover,
  createHandleVariantVisibilityChange,
  createRemoveVariantHtml,
  createRemoveVariantHtmlForSnapshot,
  DEFAULT_BUCKET_NAME,
  getVariantVisibility,
  resolveStaticBucketName,
  resolveStaticObjectPrefix,
} from './hide-variant-html-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();

const storage = new Storage();
const environmentVariables = process.env;
const bucketName = resolveStaticBucketName(
  environmentVariables,
  DEFAULT_BUCKET_NAME
);
const objectPrefix = resolveStaticObjectPrefix(environmentVariables);

const deleteRenderedFile = createBucketFileRemover({
  storage,
  bucketName,
  objectPrefix,
});

const removeVariantHtml = createRemoveVariantHtml({
  async loadPageForVariant({ pageRef }) {
    if (!pageRef || typeof pageRef.get !== 'function') {
      return null;
    }

    const pageSnap = await pageRef.get();

    if (!pageSnap?.exists) {
      return null;
    }

    return { page: pageSnap.data() };
  },
  buildVariantPath,
  deleteRenderedFile,
});

const removeVariantHtmlForSnapshot =
  createRemoveVariantHtmlForSnapshot(removeVariantHtml);

const handleVariantVisibilityChange = createHandleVariantVisibilityChange({
  removeVariantHtmlForSnapshot,
  getVisibility: getVariantVisibility,
  visibilityThreshold: VISIBILITY_THRESHOLD,
});

export const hideVariantHtml = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(change => handleVariantVisibilityChange(change));

export { handleVariantVisibilityChange };
