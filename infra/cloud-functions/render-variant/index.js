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
 * Build HTML page listing all variants of a page.
 * @param {number} pageNumber Page number.
 * @param {Array<{name: string, content: string}>} variants Variant info.
 * @returns {string} HTML page.
 */
function buildAltsHtml(pageNumber, variants) {
  const items = variants
    .map(v => {
      const words = String(v.content || '')
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');
      return `<li><a href="./p/${pageNumber}${v.name}.html">${escapeHtml(
        words
      )}</a></li>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><body><h1><a href="/">Dendrite</a></h1><ol>${items}</ol></body></html>`;
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

    const html = buildHtml(variant.content, options);
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
