import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import { buildAltsHtml, escapeHtml } from './buildAltsHtml.js';

initializeApp();
const storage = new Storage();

/**
 * Build HTML page for the variant.
 * @param {number} pageNumber Page number.
 * @param {string} content Variant content.
 * @param {Array<string>} options Option texts.
 * @returns {string} HTML page.
 */
function buildHtml(pageNumber, content, options) {
  const items = options.map(opt => `<li>${escapeHtml(opt)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Dendrite</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css" /></head><body><h1><a href="/">Dendrite</a></h1><p>${escapeHtml(
    content
  )}</p><ol>${items}</ol><p><a href="./${pageNumber}-alts.html">More options</a></p></body></html>`;
}

/**
 * Cloud Function triggered when a new variant is created.
 */
export const renderVariant = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onCreate(async (snap, ctx) => {
    const variant = snap.data();

    const pageSnap = await snap.ref.parent.parent.get();
    if (!pageSnap.exists) {
      return null;
    }
    const page = pageSnap.data();

    const optionsSnap = await snap.ref.collection('options').get();
    const options = optionsSnap.docs.map(doc => doc.data().content || '');

    const html = buildHtml(page.number, variant.content, options);
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
      });

    return null;
  });

export { buildAltsHtml };
