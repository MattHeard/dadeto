import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from '../cors-config.js';
import { getFirestoreInstance } from './firestore.js';
import { createReportForModerationHandler } from './handler.js';

const db = getFirestoreInstance();
const moderationReportsCollection = db.collection('moderationReports');
const reportForModerationHandler = createReportForModerationHandler({
  addModerationReport: moderationReportsCollection.add.bind(
    moderationReportsCollection
  ),
  getServerTimestamp: FieldValue.serverTimestamp,
});
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
 * Create a moderation report for a variant slug.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleReportForModeration(req, res) {
  const { status, body } = await reportForModerationHandler({
    method: req.method,
    body: req.body,
  });

  if (typeof body === 'string') {
    res.status(status).send(body);
    return;
  }

  if (typeof body === 'undefined') {
    res.sendStatus(status);
    return;
  }

  res.status(status).json(body);
}

app.all('/', handleReportForModeration);

export const reportForModeration = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleReportForModeration };
