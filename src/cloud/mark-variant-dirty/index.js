import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import corsConfig from './cors-config.js';
import { findPageRef, findPagesSnap, refFromSnap } from './findPageRef.js';
import { getAuth } from 'firebase-admin/auth';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { ADMIN_UID } from './admin-config.js';
import { createVerifyAdmin } from './verifyAdmin.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
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
 * @param {{
 *   findPagesSnap: typeof findPagesSnap,
 *   findVariantsSnap: typeof findVariantsSnap,
 *   refFromSnap: typeof refFromSnap,
 * }} [firebase] Optional Firebase helpers.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference | null>} Variant doc ref.
 */
async function findVariantRef(
  database,
  pageNumber,
  variantName,
  firebase = { findPagesSnap, findVariantsSnap, refFromSnap }
) {
  const pageRef = await findPageRef(database, pageNumber, firebase);
  if (!pageRef) {
    return null;
  }
  const variantsSnap = await firebase.findVariantsSnap(pageRef, variantName);
  return firebase.refFromSnap(variantsSnap);
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
 *     findVariantsSnap: typeof findVariantsSnap,
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
 * @returns {string[] | null} Match result capturing the bearer token components.
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
 * Send a 403 Forbidden response.
 * @param {import('express').Response} res HTTP response.
 * @returns {void}
 */
function sendForbidden(res) {
  res.status(403).send('Forbidden');
}

const verifyAdmin = createVerifyAdmin({
  getAuthHeader,
  matchAuthHeader,
  verifyToken: token => auth.verifyIdToken(token),
  isAdminUid: decoded => decoded.uid === ADMIN_UID,
  sendUnauthorized,
  sendForbidden,
});

/**
 * Handle HTTP requests to mark a variant as dirty.
 * @param {import('express').Request} req HTTP request.
 * @param {import('express').Response} res HTTP response.
 * @param {{
 *   markFn?: typeof markVariantDirtyImpl,
 *   verifyAdmin?: (req: import('express').Request, res: import('express').Response) => Promise<boolean>,
 * }} [deps] Optional dependencies.
 * @returns {Promise<void>} Promise resolving when response is sent.
 */
async function handleRequest(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.status(405).send('POST only');
    return;
  }

  const verifyAdminFn =
    typeof deps.verifyAdmin === 'function' ? deps.verifyAdmin : verifyAdmin;
  const authorised = await verifyAdminFn(req, res);
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
