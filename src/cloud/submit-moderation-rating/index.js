import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from '../cors-config.js';
import { randomUUID } from 'crypto';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const allowedOrigins = getAllowedOrigins(process.env);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods: ['POST'],
  })
);

app.use(express.json());

/**
 * Record a moderator's rating for their assigned variant.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleSubmitModerationRating(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const { isApproved } = req.body || {};
  if (typeof isApproved !== 'boolean') {
    res.status(400).send('Missing or invalid isApproved');
    return;
  }

  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).send('Missing or invalid Authorization header');
    return;
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    uid = decoded.uid;
  } catch (err) {
    res.status(401).send(err.message || 'Invalid or expired token');
    return;
  }

  const moderatorRef = db.collection('moderators').doc(uid);
  const moderatorSnap = await moderatorRef.get();
  if (!moderatorSnap.exists) {
    res.status(404).send('No moderation job');
    return;
  }
  const moderatorData = moderatorSnap.data();
  if (!moderatorData.variant) {
    res.status(404).send('No moderation job');
    return;
  }

  const variantRef = moderatorData.variant;
  const variantId = `/${variantRef.path}`;

  const ratingId = randomUUID();
  await db.collection('moderationRatings').doc(ratingId).set({
    moderatorId: uid,
    variantId,
    isApproved,
    ratedAt: FieldValue.serverTimestamp(),
  });

  await moderatorRef.update({ variant: FieldValue.delete() });

  res.status(201).json({});
}

app.post('/', handleSubmitModerationRating);

export const submitModerationRating = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleSubmitModerationRating };
