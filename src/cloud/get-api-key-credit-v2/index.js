import { Firestore } from './get-api-key-credit-v2-gcf.js';
import {
  createApplyCreditEvent,
  createDb,
  createFetchCredit,
  createGetApiKeyCreditV2Handler,
  extractUuid,
} from './get-api-key-credit-v2-core.js';

const db = createDb(Firestore);

export const fetchCredit = createFetchCredit(db);
export const applyCreditEvent = createApplyCreditEvent(db);

const handleRequest = createGetApiKeyCreditV2Handler({
  fetchCredit,
  applyCreditEvent,
  getUuid: extractUuid,
  logError: error => console.error(error),
});

export async function handle(req, res) {
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
}

export {
  createApplyCreditEvent,
  extractUuid,
  createDb,
} from './get-api-key-credit-v2-core.js';
