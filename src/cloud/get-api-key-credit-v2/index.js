import { initializeApp } from 'firebase-admin/app';
import { createFirebaseAppManager } from '../common-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import {
  createEffectHttpBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import {
  createGetApiKeyCreditV2EffectAdapters,
} from './effect-adapters.js';
import { initializeFirebaseApp } from './startup-effect-adapter.js';
import { createGetApiKeyCreditV2ExpressHandle } from '../../core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';

const db = createEffectStartupBoundary(allowEffects => {
  const manager = createFirebaseAppManager(permission =>
    initializeFirebaseApp(permission, initializeApp)
  );
  manager.ensureFirebaseApp(allowEffects);
  return getFirestoreInstance(allowEffects, {
    ensureAppFn: () => {},
  });
});

const handleRequest = createGetApiKeyCreditV2ExpressHandle({
  db,
  ...createGetApiKeyCreditV2EffectAdapters(db),
});
const handle = createEffectHttpBoundary((allowEffects, req, res) =>
  handleRequest(allowEffects, req, res)
);

export { handle };
