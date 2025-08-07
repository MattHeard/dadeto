import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';

initializeApp();
const storage = new Storage();

/**
 * Delete the HTML file for a variant.
 */
export const hideVariantHtml = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onDelete(async snap => {
    const variant = snap.data();
    const pageSnap = await snap.ref.parent.parent.get();
    if (!pageSnap.exists) {
      return null;
    }
    const page = pageSnap.data();
    const filePath = `p/${page.number}${variant.name}.html`;

    await storage
      .bucket('www.dendritestories.co.nz')
      .file(filePath)
      .delete({ ignoreNotFound: true });

    return null;
  });
