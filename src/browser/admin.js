import { initGoogleSignIn, getIdToken, signOut } from './googleAuth.js';
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
  getIdToken,
  getAdminEndpoints,
  fetch,
  showMessage
);

/**
 * Trigger stats generation when initiated from the admin UI.
 */
const triggerStats = createTriggerStats(
  getIdToken,
  getAdminEndpoints,
  fetch,
  showMessage
);

const regenerateVariant = createRegenerateVariant(
  getIdToken,
  document,
  showMessage,
  getAdminEndpoints,
  fetch
);

bindTriggerRenderClick(document, triggerRender);
bindTriggerStatsClick(document, triggerStats);
bindRegenerateVariantSubmit(document, regenerateVariant);

createWireSignOut(document, signOut)();
onAuthStateChanged(getAuth(), checkAccess);
initGoogleSignIn();
