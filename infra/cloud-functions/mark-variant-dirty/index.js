import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';

initializeApp();
const db = getFirestore();
const auth = getAuth();
const app = express();

const ADMIN_UID = 'qcYSrXTaj1MZUoFsAloBwT86GNM2';
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

app.use(express.json());

/**
 * Find pages snapshot for a page number.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Pages snapshot.
 */
function findPagesSnap(database, pageNumber) {
  return database
    .collectionGroup('pages')
    .where('number', '==', pageNumber)
    .limit(1)
    .get();
}

/**
 * Extract a page reference from a pages snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} pagesSnap Pages snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Page doc ref.
 */
function pageRefFromSnap(pagesSnap) {
  return pagesSnap.docs?.[0]?.ref || null;
}

/**
 * Find a reference to the page document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Page doc ref.
 */
async function findPageRef(database, pageNumber) {
  const pagesSnap = await findPagesSnap(database, pageNumber);
  return pageRefFromSnap(pagesSnap);
}

/**
 * Find a reference to the variant document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
async function findVariantRef(database, pageNumber, variantName) {
  const pageRef = await findPageRef(database, pageNumber);
  if (!pageRef) {
    return null;
  }
  const variantsSnap = await pageRef
    .collection('variants')
    .where('name', '==', variantName)
    .limit(1)
    .get();
  return variantsSnap.docs?.[0]?.ref || null;
}

/**
 * Mark a variant document as dirty so the render-variant function re-renders it.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {{db?: import('firebase-admin/firestore').Firestore}} [deps] Optional dependencies.
 * @returns {Promise<boolean>} True if variant updated.
 */
async function markVariantDirtyImpl(pageNumber, variantName, deps = {}) {
  const database = deps.db || db;
  const variantRef = await findVariantRef(database, pageNumber, variantName);
  if (!variantRef) {
    return false;
  }
  await variantRef.update({ dirty: null });
  return true;
}

/**
 * Verify that the request is authorised by an admin user.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @returns {Promise<boolean>} True if request is authorised.
 */
async function verifyAdmin(req, res) {
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).send('Missing token');
    return false;
  }

  try {
    const decoded = await auth.verifyIdToken(match[1]);
    if (decoded.uid !== ADMIN_UID) {
      res.status(403).send('Forbidden');
      return false;
    }
  } catch (e) {
    res.status(401).send(e?.message || 'Invalid token');
    return false;
  }

  return true;
}

/**
 * Handle HTTP requests to mark a variant as dirty.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @param {{markFn?: typeof markVariantDirtyImpl}} [deps] Optional dependencies.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleRequest(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const authorised = await verifyAdmin(req, res);
  if (!authorised) {
    return;
  }

  const { page, variant } = req.body || {};
  const pageNumber = Number(page);
  const variantName = typeof variant === 'string' ? variant : '';
  if (!Number.isInteger(pageNumber) || !variantName) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }

  const markFn = deps.markFn || markVariantDirtyImpl;
  try {
    const ok = await markFn(pageNumber, variantName);
    if (!ok) {
      res.status(404).json({ error: 'Variant not found' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'update failed' });
  }
}

app.post('/', handleRequest);

export const markVariantDirty = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleRequest, markVariantDirtyImpl };
