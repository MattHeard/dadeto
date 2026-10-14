import {
  Storage,
  FieldValue,
  ensureFirebaseApp,
  functions,
  getFirestoreInstance,
  saveAuthorHtml,
  updateAuthorDocument,
  bindEffectBoundary,
} from './render-author-gcf.js';
import { runRenderAuthor } from '../../core/cloud/render-author/run.js';
import { createEffectStartupBoundary } from '../allow-effects.js';
import { initializeFirebaseApp } from './startup-effect-adapter.js';
import { registerAuthorWriteTrigger } from './trigger-effect-adapter.js';

const { renderAuthor } = createEffectStartupBoundary(allowEffects => {
  initializeFirebaseApp(allowEffects, ensureFirebaseApp);
  const db = getFirestoreInstance(allowEffects, { ensureAppFn: () => {} });

  return runRenderAuthor(allowEffects, {
    db,
    functions,
    Storage,
    FieldValue,
    saveAuthorHtml,
    updateAuthorDocument,
    registerAuthorWriteTrigger,
    bindEffectBoundary,
  });
});

export const handle = renderAuthor;
