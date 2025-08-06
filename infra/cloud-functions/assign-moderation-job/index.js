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
  console.log('[assignModeration] method=%s ip=%s', req.method, req.ip);
  if (req.method !== 'POST') {
    console.warn('[assignModeration] non-POST rejected');
    res.status(405).send('POST only');
    return;
  }

  const { id_token: idToken } = req.body ?? {};
  if (!idToken) {
    console.warn('[assignModeration] id_token missing in body', req.body);
    res.status(400).send('Missing id_token');
    return;
  }

  let userRecord;
  try {
    console.log('[assignModeration] verifying token …');
    const decoded = await auth.verifyIdToken(idToken);
    console.log(
      '[assignModeration] token ok uid=%s exp=%s',
      decoded.uid,
      new Date(decoded.exp * 1000).toISOString()
    );

    userRecord = await auth.getUser(decoded.uid);
    console.log('[assignModeration] user ok email=%s', userRecord.email);
  } catch (err) {
    console.error(
      '[assignModeration] verifyIdToken failed',
      err.code,
      err.message,
      err.stack
    );
    res.status(401).send(err.message || 'Invalid or expired token');
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
