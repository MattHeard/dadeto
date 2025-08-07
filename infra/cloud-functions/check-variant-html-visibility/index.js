import { initializeApp } from 'firebase-admin/app';
import * as functions from 'firebase-functions';
import { renderVariant } from '../render-variant/index.js';
import { hideVariantHtml } from '../hide-variant-html/index.js';

initializeApp();

const VISIBILITY_THRESHOLD = 0.5;

/**
 * Check variant visibility and render or hide HTML accordingly.
 */
export const checkVariantHtmlVisibility = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(async (change, ctx) => {
    if (!change.before.exists || !change.after.exists) {
      return null;
    }
    const beforeVisibility = change.before.data().visibility || 0;
    const afterVisibility = change.after.data().visibility || 0;

    if (
      beforeVisibility < VISIBILITY_THRESHOLD &&
      afterVisibility >= VISIBILITY_THRESHOLD
    ) {
      await renderVariant(change.after, ctx);
    } else if (
      beforeVisibility >= VISIBILITY_THRESHOLD &&
      afterVisibility < VISIBILITY_THRESHOLD
    ) {
      await hideVariantHtml(change.after, ctx);
    }
    return null;
  });
