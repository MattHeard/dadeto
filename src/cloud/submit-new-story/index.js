import * as functions from 'firebase-functions/v1';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { getAllowedOrigins } from './cors-config.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

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

app.use((err, req, res, next) => {
  if (err instanceof Error && err.message === 'CORS') {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next(err);
});

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

/**
 * Handle new story submissions.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleSubmit(req, res) {
  let { title = 'Untitled', content = '', author = '???' } = req.body;
  title = title.toString().trim().slice(0, 120);
  content = content.toString().replace(/\r\n?/g, '\n').slice(0, 10_000);
  author = author.toString().trim().slice(0, 120);

  let authorId = null;
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (match) {
    try {
      const decoded = await auth.verifyIdToken(match[1]);
      authorId = decoded.uid;
    } catch {
      // ignore invalid token
    }
  }

  const options = [];
  for (let i = 0; i < 4; i += 1) {
    const raw = req.body[`option${i}`];
    if (raw === undefined || raw === null) {
      continue;
    }
    const val = raw.toString().trim().slice(0, 120);
    if (val) {
      options.push(val);
    }
  }

  const id = crypto.randomUUID();
  await db.collection('storyFormSubmissions').doc(id).set({
    title,
    content,
    author,
    authorId,
    options,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ id, title, content, author, options });
}

app.post('/', handleSubmit);

export const submitNewStory = functions
  .region('europe-west1')
  .https.onRequest(app);

export { app };
