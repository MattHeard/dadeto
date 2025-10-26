import {
  functions,
  Storage,
  ensureFirebaseApp,
} from './hide-variant-html-gcf.js';
import {
  VISIBILITY_THRESHOLD,
  buildVariantPath,
  createBucketFileRemover,
  createHandleVariantVisibilityChange,
  createRemoveVariantHtml,
  createRemoveVariantHtmlForSnapshot,
  getVariantVisibility,
} from './hide-variant-html-core.js';

ensureFirebaseApp();

const storage = new Storage();

const deleteRenderedFile = createBucketFileRemover({ storage });

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
