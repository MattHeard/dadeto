import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';

initializeApp();
const db = getFirestore();
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
 * Build the index HTML page.
 * @param {Array<{title: string, pageNumber: number}>} items Story items.
 * @returns {string} HTML page.
 */
function buildHtml(items) {
  const list = items
    .map(
      item =>
        `<li><a href="/p/${item.pageNumber}a.html">${escapeHtml(
          item.title
        )}</a></li>`
    )
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>Dendrite</title></head><body><h1><a href="/">Dendrite</a></h1><h2>Contents</h2><ol>${list}</ol></body></html>`;
}

/**
 * Get the top story statistics by variant count.
 * @returns {Promise<Array<string>>} Story IDs ordered by variant count.
 */
async function fetchTopStoryIds() {
  const snapshot = await db
    .collection('storyStats')
    .orderBy('variantCount', 'desc')
    .limit(10)
    .get();
  return snapshot.docs.map(doc => doc.id);
}

/**
 * Fetch title and page number for a story.
 * @param {string} storyId Story identifier.
 * @returns {Promise<{title: string, pageNumber: number}|null>} Story info or null.
 */
async function fetchStoryInfo(storyId) {
  const storySnap = await db.collection('stories').doc(storyId).get();
  if (!storySnap.exists) {
    return null;
  }
  const story = storySnap.data();
  const rootRef = story.rootPage;
  if (!rootRef) {
    return null;
  }
  const pageSnap = await rootRef.get();
  if (!pageSnap.exists) {
    return null;
  }
  const page = pageSnap.data();
  return { title: story.title || '', pageNumber: page.number };
}

/**
 * Cloud Function triggered when a new story is created.
 */
export const renderContents = functions
  .region('europe-west1')
  .firestore.document('stories/{storyId}')
  .onCreate(async () => {
    const ids = await fetchTopStoryIds();
    const items = [];
    for (const id of ids) {
      const info = await fetchStoryInfo(id);
      if (info) {
        items.push(info);
      }
    }
    const html = buildHtml(items);
    await storage
      .bucket('dendrite-static')
      .file('index.html')
      .save(html, { contentType: 'text/html' });
    return null;
  });
