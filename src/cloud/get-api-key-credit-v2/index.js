import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createGetApiKeyCreditV2EffectAdapters } from './effect-adapters.js';
import { createGetApiKeyCreditV2ExpressHandle } from '../../core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';

const db = getFirestoreInstance({
  ensureAppFn: createFirebaseAppManager(initializeApp).ensureFirebaseApp,
  getFirestoreFn: getAdminFirestore,
});

const handleRequest = createGetApiKeyCreditV2ExpressHandle({
  db,
  ...createGetApiKeyCreditV2EffectAdapters(db),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle };
