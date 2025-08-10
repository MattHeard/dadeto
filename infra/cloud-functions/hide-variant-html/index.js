import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';

initializeApp();
const storage = new Storage();
const BUCKET = 'www.dendritestories.co.nz';
const VISIBILITY_THRESHOLD = 0.5;

/**
 * Delete the rendered HTML for a variant when it is removed or its visibility drops below the threshold.
 */
export const hideVariantHtml = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(async change => {
    if (!change.after.exists) {
      return removeFile(change.before);
    }

    const beforeVis = change.before.data()?.visibility ?? 0;
    const afterVis = change.after.data().visibility ?? 0;
    if (beforeVis >= VISIBILITY_THRESHOLD && afterVis < VISIBILITY_THRESHOLD) {
      return removeFile(change.after);
    }

    return null;
  });

/**
 *
 * @param snap
 */
async function removeFile(snap) {
  const variant = snap.data();
  const pageSnap = await snap.ref.parent.parent.get();
  if (!pageSnap.exists) {
    return null;
  }

  const page = pageSnap.data();
  const path = `p/${page.number}${variant.name}.html`;

  await storage.bucket(BUCKET).file(path).delete({ ignoreNotFound: true });
  return null;
}
