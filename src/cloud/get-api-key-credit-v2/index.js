import { onRequest } from 'firebase-functions/v2/https';
import { Firestore } from '@google-cloud/firestore';
import {
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from './handler.js';
import { createDb } from './create-db.js';

const db = createDb(Firestore);

/**
 * Fetch stored credit for the supplied API key UUID.
 * @param {string} uuid API key UUID.
 * @returns {Promise<number|null>} Stored credit value or null when missing.
 */
export async function fetchCredit(uuid) {
  const snap = await db.collection('api-key-credit').doc(String(uuid)).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() || {};
  return data.credit ?? 0;
}

const handleRequest = createGetApiKeyCreditV2Handler({
  fetchCredit,
  getUuid: extractUuid,
  logError: error => console.error(error),
});

export const getApiKeyCreditV2 = onRequest(async (req, res) => {
  const { status, body, headers } = await handleRequest(req);

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value !== 'undefined') {
        res.set(key, value);
      }
    });
  }

  if (body && typeof body === 'object') {
    return res.status(status).json(body);
  }

  return res.status(status).send(body);
});

export { extractUuid } from './handler.js';
export { createDb } from './create-db.js';
