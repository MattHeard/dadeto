import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  Storage,
  createFirebaseAppManager,
} from './hide-variant-html-gcf.js';
import { getFirestoreInstance } from '../firestore.js';
import { createHideVariantHtmlCore } from '../../core/cloud/hide-variant-html/hide-variant-html-core.js';
import {
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import {
  createHideVariantHtmlEffectAdapters,
  initializeFirebaseApp,
} from './effect-adapters.js';

const db = createEffectStartupBoundary(allowEffects => {
  const appManager = createFirebaseAppManager(() =>
    initializeFirebaseApp(allowEffects, initializeApp)
  );
  appManager.ensureFirebaseApp();
  return getFirestoreInstance({ ensureAppFn: () => {} });
});
const { hideVariantHtml: handle, handleVariantVisibilityChange } =
  createHideVariantHtmlCore({
    functions,
    Storage,
    db,
    environmentVariables: process.env,
    createEffectInvocationBoundary,
    ...createHideVariantHtmlEffectAdapters(),
  });

export { handle, handleVariantVisibilityChange };
