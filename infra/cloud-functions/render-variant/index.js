import { initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';

initializeApp();
const storage = new Storage();

/**
 * Escape HTML special characters.
 * @param {string} text Text to escape.
 * @returns {string} Escaped text.
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build HTML page for the variant.
 * @param {string} content Variant content.
 * @param {Array<string>} options Option texts.
 * @returns {string} HTML page.
 */
function buildHtml(content, options) {
  const items = options.map(opt => `<li>${escapeHtml(opt)}</li>`).join('');
  return `<!doctype html><html lang="en"><body><h1>Dendrite</h1><p>${escapeHtml(
    content
  )}</p><ol>${items}</ol></body></html>`;
}

/**
 * Cloud Function triggered when a new variant is created.
 */
export const renderVariant = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}/pages/{pageId}/variants/{variantId}')
  .onCreate(async snap => {
    const variant = snap.data();

    const pageSnap = await snap.ref.parent.parent.get();
    if (!pageSnap.exists) {
      return null;
    }
    const page = pageSnap.data();

    const optionsSnap = await snap.ref.collection('options').get();
    const options = optionsSnap.docs.map(doc => doc.data().content || '');

    const html = buildHtml(variant.content, options);
    const filePath = `p/${page.number}${variant.name}.html`;

    await storage
      .bucket('dendrite-static')
      .file(filePath)
      .save(html, { contentType: 'text/html' });

    return null;
  });
