import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

initializeApp();
const db = getFirestore();
const auth = getAuth();
const app = express();

const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods: ['POST'],
  })
);

app.use(express.urlencoded({ extended: false }));

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
    const decoded = await auth.verifyIdToken(idToken);

    userRecord = await auth.getUser(decoded.uid);
  } catch (err) {
    res.status(401).send(err.message || 'Invalid or expired token');
    return;
  }

  const n = Math.random();

  // 1) zero-rated first
  let q = db
    .collectionGroup('variants')
    .where('moderatorReputationSum', '==', 0)
    .orderBy('rand', 'asc')
    .where('rand', '>=', n)
    .limit(1);

  let variantSnap = await q.get();

  if (variantSnap.empty) {
    q = db
      .collectionGroup('variants')
      .where('moderatorReputationSum', '==', 0)
      .orderBy('rand', 'asc')
      .where('rand', '<', n)
      .limit(1);
    variantSnap = await q.get();
  }

  // 2) fallback to any variant
  if (variantSnap.empty) {
    let q2 = db
      .collectionGroup('variants')
      .orderBy('rand', 'asc')
      .where('rand', '>=', n)
      .limit(1);
    let s2 = await q2.get();
    if (s2.empty) {
      q2 = db
        .collectionGroup('variants')
        .orderBy('rand', 'asc')
        .where('rand', '<', n)
        .limit(1);
      s2 = await q2.get();
    }
    variantSnap = s2;
  }

  if (variantSnap.empty) {
    res.status(500).send('Variant fetch failed 🤷');
    return;
  }

  const variantDoc = variantSnap.docs[0];

  const moderatorRef = db.collection('moderators').doc(userRecord.uid);
  await moderatorRef.set({
    variant: variantDoc.ref,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({});
}

app.post('/', handleAssignModerationJob);

export const assignModerationJob = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleAssignModerationJob };
