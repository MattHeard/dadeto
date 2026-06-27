import {
  functions,
  getFirestoreInstance,
} from './recalculate-moderator-reputation-gcf.js';
import {
  createRecalculateModeratorReputationJob,
} from '../../core/cloud/recalculate-moderator-reputation/run.js';
import {
  calculateModeratorReputations,
  fetchModerationRatings,
  writeModeratorReputations,
} from '../../core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js';
import { ADMIN_UID } from '../../core/commonCore.js';

const handle = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    const db = getFirestoreInstance();
    const recalculateModeratorReputationJob =
      createRecalculateModeratorReputationJob({
        db,
        fetchModerationRatings: () => fetchModerationRatings(db),
        calculateModeratorReputations,
        writeModeratorReputations,
        adminModeratorId: ADMIN_UID,
        nowIso: () => new Date().toISOString(),
      });

    await recalculateModeratorReputationJob();
    return null;
  });

export { handle };
