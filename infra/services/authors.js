import { db } from './firebase.js';
import crypto from 'crypto';

/**
 *
 * @param batch
 * @param authorId
 */
export async function ensureAuthor(batch, authorId) {
  const authorRef = db.doc(`authors/${authorId}`);
  const authorSnap = await authorRef.get();
  if (!authorSnap.exists) {
    batch.set(authorRef, { uuid: crypto.randomUUID() });
  }
}
