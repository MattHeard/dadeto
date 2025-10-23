import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { isAllowedOrigin } from './cors.js';
import { productionOrigins } from './core.js';

const db = getFirestoreInstance();
ensureFirebaseApp();
const auth = getAuth();
const app = express();

const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return playwrightOrigin ? [playwrightOrigin] : [];
  }

  return productionOrigins;
};

const allowedOrigins = getAllowedOrigins(process.env); // includes static-site domain

const createHandleCorsOrigin = origins => (origin, cb) => {
  if (isAllowedOrigin(origin, origins)) {
    cb(null, true);
  } else {
    cb(new Error('CORS'));
  }
};
const handleCorsOrigin = createHandleCorsOrigin(allowedOrigins);
const corsOptions = {
  origin: handleCorsOrigin,
  methods: ['GET'],
};
const applyCorsMiddleware = (application, corsFactory, options) => {
  application.use(corsFactory(options));
};

applyCorsMiddleware(app, cors, corsOptions);

/**
 * Fetch the variant assigned to the authenticated moderator.
 * @param {import('express').Request} req HTTP request object.
 * @param {import('express').Response} res HTTP response object.
 * @returns {Promise<void>} Promise resolving when the response is sent.
 */
async function handleGetModerationVariant(req, res) {
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).send('Missing or invalid Authorization header');
    return;
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    uid = decoded.uid;
  } catch (err) {
    res.status(401).send(err.message || 'Invalid or expired token');
    return;
  }

  const moderatorSnap = await db.collection('moderators').doc(uid).get();
  if (!moderatorSnap.exists) {
    res.status(404).send('No moderation job');
    return;
  }
  const data = moderatorSnap.data();
  if (!data.variant) {
    res.status(404).send('No moderation job');
    return;
  }

  const variantRef = data.variant;
  const variantSnap = await variantRef.get();
  if (!variantSnap.exists) {
    res.status(404).send('Variant not found');
    return;
  }
  const variantData = variantSnap.data();

  const pageSnap = await variantRef.parent.parent.get();
  const storySnap = await pageSnap.ref.parent.parent.get();
  const storyTitle = storySnap.exists ? storySnap.data().title || '' : '';

  const optionsSnap = await variantRef.collection('options').get();
  const options = optionsSnap.docs.map(doc => {
    const { content = '', targetPageNumber } = doc.data();
    return targetPageNumber !== undefined
      ? { content, targetPageNumber }
      : { content };
  });

  res.status(200).json({
    title: storyTitle,
    content: variantData.content || '',
    author: variantData.author || '',
    options,
  });
}

app.get('/', handleGetModerationVariant);

export const getModerationVariant = functions
  .region('europe-west1')
  .https.onRequest(app);

export { handleGetModerationVariant };
