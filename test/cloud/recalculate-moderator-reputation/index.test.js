import { expect, jest, test } from '@jest/globals';

test('scheduled executions mint distinct permissions for reputation writes', async () => {
  let scheduledHandler;
  const db = { collection: jest.fn() };
  const fetchModerationRatings = jest.fn().mockResolvedValue([]);
  const calculateModeratorReputations = jest.fn().mockReturnValue([]);
  const writeModeratorReputations = jest.fn().mockResolvedValue(undefined);
  const onRun = jest.fn(handler => {
    scheduledHandler = handler;
    return handler;
  });
  const functions = {
    region: jest.fn(() => ({
      pubsub: {
        schedule: jest.fn(() => ({ onRun })),
      },
    })),
  };

  await jest.isolateModulesAsync(async () => {
    await jest.unstable_mockModule(
      '../../../src/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-gcf.js',
      () => ({ functions, getFirestoreInstance: () => db })
    );
    await jest.unstable_mockModule(
      '../../../src/core/cloud/recalculate-moderator-reputation/recalculate-moderator-reputation-core.js',
      () => ({ calculateModeratorReputations, fetchModerationRatings })
    );
    await jest.unstable_mockModule(
      '../../../src/cloud/recalculate-moderator-reputation/effect-adapters.js',
      () => ({ writeModeratorReputations })
    );
    await import(
      '../../../src/cloud/recalculate-moderator-reputation/index.js'
    );
  });

  await scheduledHandler();
  await scheduledHandler();

  const firstPermission = writeModeratorReputations.mock.calls[0][0];
  const secondPermission = writeModeratorReputations.mock.calls[1][0];
  expect(firstPermission).not.toBe(secondPermission);
  expect(Object.isFrozen(firstPermission)).toBe(true);
  expect(Object.isFrozen(secondPermission)).toBe(true);
  expect(writeModeratorReputations).toHaveBeenCalledTimes(2);
  expect(fetchModerationRatings).toHaveBeenCalledWith(db);
});
