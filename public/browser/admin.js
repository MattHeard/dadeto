import * as googleAuth from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import {
  createGetAdminEndpointsFromStaticConfig,
  getStatusParagraph,
  createShowMessage,
  createCheckAccess,
  createTriggerRender,
  createTriggerStats,
  createRegenerateVariant,
  bindTriggerRenderClick,
  bindTriggerStatsClick,
  bindRegenerateVariantSubmit,
  createWireSignOut,
} from './admin-core.js';
import {
  getAuth,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const getAdminEndpoints = createGetAdminEndpointsFromStaticConfig(
  loadStaticConfig
);
const showMessage = createShowMessage(getStatusParagraph, document);

const checkAccess = createCheckAccess(getAuth, document);

/**
 * Trigger render when initiated from the admin UI.
 */
const triggerRender = createTriggerRender(
  googleAuth,
  getAdminEndpoints,
  fetch,
  showMessage
);

/**
 * Trigger stats generation when initiated from the admin UI.
 */
const triggerStats = createTriggerStats(
  googleAuth,
  getAdminEndpoints,
  fetch,
  showMessage
);

const regenerateVariant = createRegenerateVariant(
  googleAuth,
  document,
  showMessage,
  getAdminEndpoints,
  fetch
);

bindTriggerRenderClick(document, triggerRender);
bindTriggerStatsClick(document, triggerStats);
bindRegenerateVariantSubmit(document, regenerateVariant);

createWireSignOut(document, googleAuth)();
onAuthStateChanged(getAuth(), checkAccess);
googleAuth.initGoogleSignIn();
