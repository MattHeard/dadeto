import { initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { getAllowedOrigins } from '../cors-config.js';
import {
  createEffectHttpBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import { createGetAuthorUuidV2EffectAdapters } from './effect-adapters.js';
import { createGetAuthorUuidV2BillingRuntime } from './billing-runtime.js';
import { initializeFirebaseApp } from './startup-effect-adapter.js';
import { createGetAuthorUuidV2ExpressHandle } from './get-author-uuid-v2-core.js';
const db = createEffectStartupBoundary(allowEffects => {
  const manager = createFirebaseAppManager(permission =>
    initializeFirebaseApp(permission, initializeApp)
  );
  manager.ensureFirebaseApp(allowEffects);
  return getFirestoreInstance(allowEffects, {
    ensureAppFn: () => {},
    getFirestoreFn: getAdminFirestore,
  });
});
const auth = getAdminAuth();
const effectAdapters = createGetAuthorUuidV2EffectAdapters({ db });
const billing = createGetAuthorUuidV2BillingRuntime(
  db,
  process.env,
  effectAdapters.resolveBillingIdentity
);
const handleRequest = createGetAuthorUuidV2ExpressHandle({
  db,
  auth,
  randomUUID,
  allowedOrigins: getAllowedOrigins(process.env),
  billing,
  getAuthorDocument: effectAdapters.getAuthorDocument,
  setAuthorDocument: effectAdapters.setAuthorDocument,
  sendJsonResponse: effectAdapters.sendJsonResponse,
  setResponseHeader: effectAdapters.setResponseHeader,
  sendEmptyResponse: effectAdapters.sendEmptyResponse,
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle };
