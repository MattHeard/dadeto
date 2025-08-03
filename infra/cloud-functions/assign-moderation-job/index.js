import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

initializeApp();
const db = getFirestore();
const auth = getAuth();

/**
 * Assign a random moderation job to the requesting user.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleAssignModerationJob(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const { id_token: idToken } = req.body ?? {};
  if (!idToken) {
    res.status(400).send('Missing id_token');
    return;
  }

  let userRecord;
  try {
    const { uid } = await auth.verifyIdToken(idToken);
    userRecord = await auth.getUser(uid);
  } catch {
    res.status(401).send('Invalid or expired token');
    return;
  }

  const total = (await db.collectionGroup('variants').count().get()).data()
    .count;
  if (!total) {
    res.status(404).send('No variants to moderate');
    return;
  }

  const randomOffset = Math.floor(Math.random() * total);
  const variantSnap = await db
    .collectionGroup('variants')
    .limit(1)
    .offset(randomOffset)
    .get();

  if (variantSnap.empty) {
    res.status(500).send('Variant fetch failed 🤷');
    return;
  }

  const variantDoc = variantSnap.docs[0];

  const ratingsRef = await db.collection('moderationRatings').add({
    createdAt: FieldValue.serverTimestamp(),
    firebaseUid: db.doc(`users/${userRecord.uid}`),
    variant: variantDoc.ref,
  });

  res.status(201).json({ moderationId: ratingsRef.id });
}

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(handleAssignModerationJob);
