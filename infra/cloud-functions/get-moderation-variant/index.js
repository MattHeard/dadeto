import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

initializeApp();
const db = getFirestore();
const auth = getAuth();

/**
 * Fetch the variant assigned to the authenticated moderator.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleGetModerationVariant(req, res) {
  console.log('[getModerationVariant] method=%s ip=%s', req.method, req.ip);
  if (req.method !== 'GET') {
    console.warn('[getModerationVariant] non-GET rejected');
    res.status(405).send('GET only');
    return;
  }

  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    console.warn('[getModerationVariant] missing bearer token');
    res.status(401).send('Missing or invalid Authorization header');
    return;
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    uid = decoded.uid;
    console.log('[getModerationVariant] token ok uid=%s', uid);
  } catch (err) {
    console.error(
      '[getModerationVariant] verifyIdToken failed',
      err.code,
      err.message,
      err.stack
    );
    res.status(401).send(err.message || 'Invalid or expired token');
    return;
  }

  const moderatorSnap = await db.collection('moderators').doc(uid).get();
  if (!moderatorSnap.exists) {
    res.status(404).send('No moderation job');
    return;
  }
  const data = moderatorSnap.data();
  if (!data.variant) {
    res.status(404).send('No moderation job');
    return;
  }

  const variantRef = data.variant;
  const variantSnap = await variantRef.get();
  if (!variantSnap.exists) {
    res.status(404).send('Variant not found');
    return;
  }
  const variantData = variantSnap.data();

  const pageSnap = await variantRef.parent.parent.get();
  const storySnap = await pageSnap.ref.parent.parent.get();
  const storyTitle = storySnap.exists ? storySnap.data().title || '' : '';

  const optionsSnap = await variantRef.collection('options').get();
  const options = optionsSnap.docs.map(doc => {
    const { content = '', targetPageNumber } = doc.data();
    return targetPageNumber !== undefined
      ? { content, targetPageNumber }
      : { content };
  });

  res.status(200).json({
    title: storyTitle,
    content: variantData.content || '',
    author: variantData.author || '',
    options,
  });
}

export const getModerationVariant = functions
  .region('europe-west1')
  .https.onRequest(handleGetModerationVariant);

export { handleGetModerationVariant };
