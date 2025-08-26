import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { decideRemovalPath } from './logic.js';

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
    const pageRef = change.after.ref.parent.parent;
    const pageSnap = await pageRef.get();
    if (!pageSnap.exists) {
      return null;
    }
    const path = decideRemovalPath(
      change.before.exists ? change.before.data() : null,
      change.after.exists ? change.after.data() : null,
      pageSnap.data(),
      VISIBILITY_THRESHOLD
    );
    if (path) {
      await storage.bucket(BUCKET).file(path).delete({ ignoreNotFound: true });
    }
    return null;
  });
