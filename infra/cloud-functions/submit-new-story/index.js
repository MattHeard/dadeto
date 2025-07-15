import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';

initializeApp();
const db = getFirestore();
const app = express();

const allowed = ['https://mattheard.net', 'https://dendritestories.co.nz'];
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || allowed.includes(origin)
        ? cb(null, true)
        : cb(new Error('CORS')),
    methods: ['POST'],
  })
);

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
  content = content.toString().trim().slice(0, 10_000);
  author = author.toString().trim().slice(0, 120);

  const options = [];
  for (let i = 0; i < 4; i += 1) {
    const raw = req.body[`option${i}`];
    if (raw == null) {
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
    options,
    processed: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({ id, title, content, author, options });
}

app.post('/', handleSubmit);

export const submitNewStory = functions
  .region('europe-west3')
  .https.onRequest(app);
