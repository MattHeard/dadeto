import { initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createGetAuthorUuidV2EffectAdapters } from './effect-adapters.js';
import { createGetAuthorUuidV2ExpressHandle } from './get-author-uuid-v2-core.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);
ensureFirebaseApp();

const db = getFirestoreInstance({
  ensureAppFn: ensureFirebaseApp,
  getFirestoreFn: getAdminFirestore,
});
const auth = getAdminAuth();
const handleRequest = createGetAuthorUuidV2ExpressHandle({
  db,
  auth,
  randomUUID,
  ...createGetAuthorUuidV2EffectAdapters(),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle };
