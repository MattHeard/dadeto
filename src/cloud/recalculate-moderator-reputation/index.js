import {
  functions,
  getFirestoreInstance,
} from './recalculate-moderator-reputation-gcf.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';
import {
  createRecalculateModeratorReputationJob,
} from '../../core/cloud/recalculate-moderator-reputation/run.js';
import {
  calculateModeratorReputations,
  fetchModerationRatings,
} from '../../core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js';
import { ADMIN_UID } from '../../core/commonCore.js';
import { writeModeratorReputations } from './effect-adapters.js';

const handle = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(createEffectInvocationBoundary(async allowEffects => {
    const db = getFirestoreInstance();
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
  }));

export { handle };
