import * as functions from 'firebase-functions/v1';
import { Storage } from '@google-cloud/storage';
import { createRemoveVariantHtml } from '../../core/cloud/hide-variant-html/removeVariantHtml.js';
import { ensureFirebaseApp } from './firebaseApp.js';

ensureFirebaseApp();
const storage = new Storage();
const BUCKET = 'www.dendritestories.co.nz';
const VISIBILITY_THRESHOLD = 0.5;

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
  buildVariantPath({ page, variantData }) {
    return `p/${page.number}${variantData.name}.html`;
  },
  deleteRenderedFile(path) {
    return storage.bucket(BUCKET).file(path).delete({ ignoreNotFound: true });
  },
});

/**
 * Transform a Firestore variant snapshot into the payload expected by the core helper.
 * @param {functions.firestore.DocumentSnapshot} snap Variant snapshot to adapt.
 * @returns {Promise<null>} Result of the removal helper.
 */
function removeVariantHtmlForSnapshot(snap) {
  return removeVariantHtml({
    variantId: snap.id,
    variantData: snap.data(),
    pageRef: snap.ref.parent?.parent ?? null,
  });
}

/**
 * Delete the rendered HTML for a variant when it is removed or its visibility drops below the threshold.
 */
export const hideVariantHtml = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(async change => {
    if (!change.after.exists) {
      return removeVariantHtmlForSnapshot(change.before);
    }

    const beforeVis = change.before.data()?.visibility ?? 0;
    const afterVis = change.after.data().visibility ?? 0;
    if (beforeVis >= VISIBILITY_THRESHOLD && afterVis < VISIBILITY_THRESHOLD) {
      return removeVariantHtmlForSnapshot(change.after);
    }

    return null;
  });
