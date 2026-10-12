import { jest } from '@jest/globals';
import { createRecalculateModeratorReputationJob } from '../../src/core/cloud/recalculate-moderator-reputation/run.js';

describe('recalculate-moderator-reputation cloud job', () => {
  it('recomputes and persists moderator reputations on each run', async () => {
    const allowEffects = Object.freeze({ invocation: true });
    const fetchModerationRatings = jest.fn().mockResolvedValue([
      { moderatorId: 'admin', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-1', isApproved: true },
      { moderatorId: 'mod-a', variantId: 'page-2', isApproved: false },
    ]);
    const calculateModeratorReputations = jest.fn().mockReturnValue([
      { moderatorId: 'admin', reputation: 1 },
      { moderatorId: 'mod-a', reputation: 0.5 },
    ]);
    const writeModeratorReputations = jest.fn().mockResolvedValue(undefined);
    const nowIso = jest.fn().mockReturnValue('2026-06-27T00:00:00.000Z');

    const job = createRecalculateModeratorReputationJob({
      fetchModerationRatings,
      calculateModeratorReputations,
      writeModeratorReputations,
      adminModeratorId: 'admin',
      nowIso,
    });

    await job(allowEffects);

    expect(fetchModerationRatings).toHaveBeenCalledTimes(1);
    expect(calculateModeratorReputations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ moderatorId: 'admin' }),
      ]),
      'admin'
    );
    expect(writeModeratorReputations).toHaveBeenCalledWith(
      allowEffects,
      expect.arrayContaining([
        expect.objectContaining({ moderatorId: 'admin', reputation: 1 }),
      ]),
      { updatedAt: '2026-06-27T00:00:00.000Z' }
    );
    expect(nowIso).toHaveBeenCalledTimes(1);
  });
});
