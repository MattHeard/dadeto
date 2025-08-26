import { db, serverTimestamp, increment } from './firebase.js';

/**
 *
 * @param id
 */
export function storyRef(id) {
  return db.collection('stories').doc(id);
}

/**
 *
 * @param batch
 * @param storyId
 * @param root0
 * @param root0.title
 * @param root0.rootPage
 */
export function createStory(batch, storyId, { title, rootPage }) {
  const ref = storyRef(storyId);
  batch.set(ref, { title, rootPage, createdAt: serverTimestamp() });
  return ref;
}

/**
 *
 * @param batch
 * @param storyId
 * @param data
 */
export function setStoryStats(batch, storyId, data) {
  const ref = db.doc(`storyStats/${storyId}`);
  batch.set(ref, data);
  return ref;
}

/**
 *
 * @param batch
 * @param storyId
 * @param amount
 */
export function incrementVariantCount(batch, storyId, amount = 1) {
  const ref = db.doc(`storyStats/${storyId}`);
  batch.set(ref, { variantCount: increment(amount) }, { merge: true });
  return ref;
}
