import {
  functions,
  ensureFirebaseApp,
  getFirestoreInstance,
} from './recalculate-moderator-reputation-gcf.js';
import {
  createEffectInvocationBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import {
  createRecalculateModeratorReputationJob,
} from '../../core/cloud/recalculate-moderator-reputation/run.js';
import {
  calculateModeratorReputations,
  fetchModerationRatings,
} from '../../core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js';
import { ADMIN_UID } from '../../core/commonCore.js';
import { writeModeratorReputations } from './effect-adapters.js';
import {
  initializeModeratorReputationFirebase,
  registerModeratorReputationSchedule,
} from './startup-effect-adapters.js';

const scheduledHandler = createEffectInvocationBoundary(async allowEffects => {
  initializeModeratorReputationFirebase(allowEffects, ensureFirebaseApp);
  const db = getFirestoreInstance(allowEffects, { ensureAppFn: () => {} });
  const recalculateModeratorReputationJob =
    createRecalculateModeratorReputationJob({
      fetchModerationRatings: () => fetchModerationRatings(db),
      calculateModeratorReputations,
      writeModeratorReputations: (permission, reputations, metadata) =>
        writeModeratorReputations(permission, db, reputations, metadata),
      adminModeratorId: ADMIN_UID,
      nowIso: () => new Date().toISOString(),
    });

  await recalculateModeratorReputationJob(allowEffects);
  return null;
});

const handle = createEffectStartupBoundary(allowEffects =>
  registerModeratorReputationSchedule(allowEffects, functions, scheduledHandler)
);

export { handle };
