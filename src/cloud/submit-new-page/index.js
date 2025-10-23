import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from './cors-config.js';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from './helpers.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { createHandleSubmit } from './core.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const handleSubmitCore = createHandleSubmit({
  verifyIdToken: (token) => auth.verifyIdToken(token),
  saveSubmission: (id, data) =>
    db.collection('pageFormSubmissions').doc(id).set(data),
  randomUUID: () => crypto.randomUUID(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  parseIncomingOption,
  findExistingOption: (parsed) => findExistingOption(db, parsed),
  findExistingPage: (pageNumber) => findExistingPage(db, pageNumber),
});

const allowedOrigins = getAllowedOrigins(process.env); // includes static-site domain
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

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

/**
 * Handle new page submissions.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleSubmit(req, res) {
  const { status, body } = await handleSubmitCore(req);
  res.status(status).json(body);
}

app.post('/', handleSubmit);

export const submitNewPage = functions
  .region('europe-west1')
  .https.onRequest(app);
