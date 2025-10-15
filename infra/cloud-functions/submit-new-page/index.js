import * as functions from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from './helpers.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const { allowedOrigins } = corsConfig; // includes static-site domain
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
  const { incoming_option: rawIncomingOption, page: rawPage } = req.body;
  let { content = '', author = '???' } = req.body;
  let authorId = null;

  const incomingOption =
    rawIncomingOption?.toString().trim().slice(0, 120) || '';
  const pageStr = rawPage?.toString().trim().slice(0, 120) || '';
  const hasIncoming = incomingOption !== '';
  const hasPage = pageStr !== '';
  if ((hasIncoming ? 1 : 0) + (hasPage ? 1 : 0) !== 1) {
    res
      .status(400)
      .json({ error: 'must provide exactly one of incoming option or page' });
    return;
  }

  content = content.toString().replace(/\r\n?/g, '\n').slice(0, 10_000);
  author = author.toString().trim().slice(0, 120);

  let incomingOptionFullName = null;
  let pageNumber = null;

  if (hasIncoming) {
    const parsed = parseIncomingOption(incomingOption);
    if (!parsed) {
      res.status(400).json({ error: 'invalid incoming option' });
      return;
    }
    const found = await findExistingOption(db, parsed);
    if (!found) {
      res.status(400).json({ error: 'incoming option not found' });
      return;
    }
    incomingOptionFullName = found;
  } else {
    const parsedPage = Number.parseInt(pageStr, 10);
    if (!Number.isInteger(parsedPage)) {
      res.status(400).json({ error: 'invalid page' });
      return;
    }
    const pagePath = await findExistingPage(db, parsedPage);
    if (!pagePath) {
      res.status(400).json({ error: 'page not found' });
      return;
    }
    pageNumber = parsedPage;
  }

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
  await db.collection('pageFormSubmissions').doc(id).set({
    incomingOptionFullName,
    pageNumber,
    content,
    author,
    authorId,
    options,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({
    id,
    incomingOptionFullName,
    pageNumber,
    content,
    author,
    options,
  });
}

app.post('/', handleSubmit);

export const submitNewPage = functions
  .region('europe-west1')
  .https.onRequest(app);
