import {
  functions,
  getFirestoreInstance,
} from './recalculate-moderator-reputation-gcf.js';
import {
  calculateModeratorReputations,
  fetchModerationRatings,
  writeModeratorReputations,
} from '../../core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js';
import { ADMIN_UID } from '../../core/commonCore.js';

const db = getFirestoreInstance();

async function recalculateModeratorReputationJob() {
  const ratings = await fetchModerationRatings(db);
  const reputations = calculateModeratorReputations(ratings, ADMIN_UID);
  await writeModeratorReputations(db, reputations, {
    updatedAt: new Date().toISOString(),
  });
}

export const handle = functions
  .region('europe-west1')
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    await recalculateModeratorReputationJob();
    return null;
  });

export { recalculateModeratorReputationJob };
