import { jest } from '@jest/globals';
import { createRecalculateModeratorReputationJob } from '../../../../src/core/cloud/recalculate-moderator-reputation/run.js';

test('loads ratings, calculates reputations, and writes them with a timestamp', async () => {
  const allowEffects = Object.freeze({ allowed: true });
  const ratings = [{ moderatorId: 'moderator', rating: 1 }];
  const reputations = [{ moderatorId: 'moderator', score: 1 }];
  const fetchModerationRatings = jest.fn().mockResolvedValue(ratings);
  const calculateModeratorReputations = jest.fn(() => reputations);
  const writeModeratorReputations = jest.fn().mockResolvedValue(undefined);
  const nowIso = jest.fn(() => '2026-08-09T00:00:00.000Z');
  const job = createRecalculateModeratorReputationJob({
    fetchModerationRatings,
    calculateModeratorReputations,
    writeModeratorReputations,
    adminModeratorId: 'admin',
    nowIso,
  });

  await expect(job(allowEffects)).resolves.toBeUndefined();
  expect(fetchModerationRatings).toHaveBeenCalledTimes(1);
  expect(calculateModeratorReputations).toHaveBeenCalledWith(ratings, 'admin');
  expect(writeModeratorReputations).toHaveBeenCalledWith(
    allowEffects,
    reputations,
    {
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
  );
});
