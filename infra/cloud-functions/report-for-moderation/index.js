import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import { getFirestoreInstance } from './firestore.js';

const db = getFirestoreInstance();
const app = express();

const { allowedOrigins } = corsConfig;
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
 * Create a moderation report for a variant slug.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleReportForModeration(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const { variant } = req.body || {};
  if (typeof variant !== 'string' || !variant.trim()) {
    res.status(400).send('Missing or invalid variant');
    return;
  }

  const slug = variant.trim();
  await db.collection('moderationReports').add({
    variant: slug,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({});
}

app.post('/', handleReportForModeration);

export const reportForModeration = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleReportForModeration };
