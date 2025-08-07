import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { buildAltsHtml } from './buildAltsHtml.js';
import { buildHtml } from './buildHtml.js';

initializeApp();
const storage = new Storage();
const VISIBILITY_THRESHOLD = 0.5;

/**
 * Render a variant when it is created or its visibility crosses upwards past the threshold.
 */
export const renderVariant = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onWrite(async (change, ctx) => {
    if (!change.before.exists) {
      return render(change.after, ctx);
    }

    const beforeVis = change.before.data().visibility ?? 0;
    const afterVis = change.after.data().visibility ?? 0;
    if (beforeVis < VISIBILITY_THRESHOLD && afterVis >= VISIBILITY_THRESHOLD) {
      return render(change.after, ctx);
    }

    return null;
  });

/**
 *
 * @param snap
 * @param ctx
 */
async function render(snap, ctx) {
  const variant = snap.data();

  const pageSnap = await snap.ref.parent.parent.get();
  if (!pageSnap.exists) {
    return null;
  }
  const page = pageSnap.data();

  const optionsSnap = await snap.ref.collection('options').get();
  const options = optionsSnap.docs.map(doc => doc.data().content || '');
  let storyTitle = '';
  if (!page.incomingOptionId) {
    const storySnap = await pageSnap.ref.parent.parent.get();
    if (storySnap.exists) {
      storyTitle = storySnap.data().title || '';
    }
  }

  const html = buildHtml(page.number, variant.content, options, storyTitle);
  const filePath = `p/${page.number}${variant.name}.html`;

  await storage
    .bucket('www.dendritestories.co.nz')
    .file(filePath)
    .save(html, { contentType: 'text/html' });

  const variantsSnap = await snap.ref.parent.get();
  const variants = variantsSnap.docs.map(doc => ({
    name: doc.data().name || '',
    content: doc.data().content || '',
  }));
  const altsHtml = buildAltsHtml(page.number, variants);
  const altsPath = `p/${page.number}-alts.html`;

  await storage
    .bucket('www.dendritestories.co.nz')
    .file(altsPath)
    .save(altsHtml, { contentType: 'text/html' });

  const pendingPath = `pending/${ctx.params.storyId}.json`;
  await storage
    .bucket('www.dendritestories.co.nz')
    .file(pendingPath)
    .save(JSON.stringify({ path: filePath }), {
      contentType: 'application/json',
      metadata: { cacheControl: 'no-store' }, // 🔑 stop both positive *and* negative caching
    });

  return null;
}

export { buildAltsHtml, buildHtml };
