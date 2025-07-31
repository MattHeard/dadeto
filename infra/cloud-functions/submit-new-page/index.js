import * as functions from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { parseIncomingOption, findExistingOption } from './helpers.js';

initializeApp();
const db = getFirestore();
const app = express();

const allowed = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'http://www.dendritestories.co.nz',
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

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

/**
 * Handle new page submissions.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleSubmit(req, res) {
  const { incoming_option: rawIncomingOption } = req.body;
  let { content = '', author = '???' } = req.body;

  if (rawIncomingOption === null) {
    res.status(400).json({ error: 'incoming option null' });
    return;
  }

  const incomingOption =
    rawIncomingOption?.toString().trim().slice(0, 120) || '';
  content = content.toString().trim().slice(0, 10_000);
  author = author.toString().trim().slice(0, 120);

  const parsed = parseIncomingOption(incomingOption);

  let incomingOptionId = null;
  if (!parsed) {
    res.status(400).json({ error: 'invalid incoming option' });
    return;
  }
  const found = await findExistingOption(db, parsed);
  if (!found) {
    res.status(400).json({ error: 'incoming option not found' });
    return;
  }
  incomingOptionId = found;

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
  await db.collection('pageFormSubmissions').doc(id).set({
    incomingOptionId,
    content,
    author,
    options,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({
    id,
    incomingOptionId,
    content,
    author,
    options,
  });
}

app.post('/', handleSubmit);

export const submitNewPage = functions
  .region('europe-west1')
  .https.onRequest(app);
