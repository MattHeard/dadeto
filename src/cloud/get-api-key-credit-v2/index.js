import { onRequest, Firestore } from './get-api-key-credit-v2-gcf.js';
import {
  createDb,
  createFetchCredit,
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from './get-api-key-credit-v2-core.js';

const db = createDb(Firestore);

export const fetchCredit = createFetchCredit(db);

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

export { extractUuid, createDb } from './get-api-key-credit-v2-core.js';
export { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';
