import { db, serverTimestamp } from './firebase.js';
import { storyRef } from './stories.js';

/**
 *
 * @param storyId
 * @param pageId
 */
export function pageRef(storyId, pageId) {
  return storyRef(storyId).collection('pages').doc(pageId);
}

/**
 *
 * @param batch
 * @param storyId
 * @param pageId
 * @param root0
 * @param root0.number
 * @param root0.incomingOption
 */
export function createPage(batch, storyId, pageId, { number, incomingOption }) {
  const ref = pageRef(storyId, pageId);
  batch.set(ref, {
    number,
    incomingOption,
    createdAt: serverTimestamp(),
  });
  return ref;
}

/**
 *
 * @param i
 */
export async function findAvailablePageNumber(i = 0) {
  const max = 2 ** i;
  const candidate = Math.floor(Math.random() * max) + 1;
  const existing = await db
    .collectionGroup('pages')
    .where('number', '==', candidate)
    .limit(1)
    .get();
  if (existing.empty) {
    return candidate;
  }
  return findAvailablePageNumber(i + 1);
}

/**
 *
 * @param pageNumber
 */
export async function findPageByNumber(pageNumber) {
  const snapshot = await db
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
  return snapshot;
}
