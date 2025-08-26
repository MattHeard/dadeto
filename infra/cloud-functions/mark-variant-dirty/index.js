import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { findPageRef } from './findPageRef.js';

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
 * Extract a document reference from a query snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} snap Query snapshot.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Document ref.
 */
function refFromSnap(snap) {
  return snap.docs?.[0]?.ref || null;
}

/**
 * Find variants snapshot for a variant name.
 * @param {import('firebase-admin/firestore').DocumentReference} pageRef Page doc ref.
 * @param {string} variantName Variant name.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Variants snapshot.
 */
function findVariantsSnap(pageRef, variantName) {
  return pageRef
    .collection('variants')
    .where('name', '==', variantName)
    .limit(1)
    .get();
}

/**
 * Find a reference to the variant document.
 * @param {import('firebase-admin/firestore').Firestore} database Firestore instance.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {{findPagesSnap: typeof findPagesSnap, refFromSnap: typeof refFromSnap}} [firebase]
 * Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
async function findVariantRef(database, pageNumber, variantName, firebase) {
  const fb = firebase || { findPagesSnap, refFromSnap };
  const pageRef = await findPageRef(database, pageNumber, fb);
  if (!pageRef) {
    return null;
  }
  const variantsSnap = await findVariantsSnap(pageRef, variantName);
  return refFromSnap(variantsSnap);
}

/**
 * Update a variant document with a dirty flag.
 * @param {import('firebase-admin/firestore').DocumentReference} variantRef Variant doc ref.
 * @returns {Promise<void>} Promise resolving when update completes.
 */
function updateVariantDirty(variantRef) {
  return variantRef.update({ dirty: null });
}

/**
 * Mark a variant document as dirty so the render-variant function re-renders it.
 * @param {number} pageNumber Page number.
 * @param {string} variantName Variant name.
 * @param {{
 *   db?: import('firebase-admin/firestore').Firestore,
 *   firebase?: {
 *     findPagesSnap: typeof findPagesSnap,
 *     refFromSnap: typeof refFromSnap,
 *   },
 * }} [deps] Optional dependencies.
 * @returns {Promise<boolean>} True if variant updated.
 */
async function markVariantDirtyImpl(pageNumber, variantName, deps = {}) {
  const database = deps.db || db;
  const variantRef = await findVariantRef(
    database,
    pageNumber,
    variantName,
    deps.firebase
  );
  if (!variantRef) {
    return false;
  }
  await updateVariantDirty(variantRef);
  return true;
}

/**
 * Extract the Authorization header from a request.
 * @param {import('express').Request} req HTTP request.
 * @returns {string} Authorization header or empty string.
 */
function getAuthHeader(req) {
  return req.get('Authorization') || '';
}

/**
 * Match a bearer token from an Authorization header.
 * @param {string} authHeader Authorization header.
 * @returns {RegExpMatchArray | null} Match result.
 */
function matchAuthHeader(authHeader) {
  return authHeader.match(/^Bearer (.+)$/);
}

/**
 * Send a 401 response with a message.
 * @param {import('express').Response} res HTTP response.
 * @param {string} message Message to send.
 * @returns {void}
 */
function sendUnauthorized(res, message) {
  res.status(401).send(message);
}

/**
 * Decode an auth token.
 * @param {string} token ID token.
 * @returns {Promise<import('firebase-admin/auth').DecodedIdToken>} Decoded token.
 */
function decodeAuth(token) {
  return auth.verifyIdToken(token);
}

/**
 * Determine if a decoded token does not belong to the admin user.
 * @param {import('firebase-admin/auth').DecodedIdToken} decoded Decoded token.
 * @returns {boolean} True if not admin.
 */
function isNotAdmin(decoded) {
  return decoded.uid !== ADMIN_UID;
}

/**
 * Send a 403 Forbidden response.
 * @param {import('express').Response} res HTTP response.
 * @returns {void}
 */
function sendForbidden(res) {
  res.status(403).send('Forbidden');
}

/**
 * Verify that the request is authorised by an admin user.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @returns {Promise<boolean>} True if request is authorised.
 */
async function verifyAdmin(req, res) {
  const authHeader = getAuthHeader(req);
  const match = matchAuthHeader(authHeader);
  if (!match) {
    sendUnauthorized(res, 'Missing token');
    return false;
  }

  try {
    const decoded = await decodeAuth(match[1]);
    if (isNotAdmin(decoded)) {
      sendForbidden(res);
      return false;
    }
  } catch (e) {
    sendUnauthorized(res, e?.message || 'Invalid token');
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
