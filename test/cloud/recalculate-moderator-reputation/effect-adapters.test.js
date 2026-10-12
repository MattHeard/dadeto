import { jest } from '@jest/globals';
import { writeModeratorReputations } from '../../../src/cloud/recalculate-moderator-reputation/effect-adapters.js';

test('writes moderator scores and marks existing authors dirty through a permission-first adapter', async () => {
  const moderatorSets = [];
  const authorSets = [];
  const authorGets = [];
  const db = {
    collection: name => ({
      doc: id => ({
        set: jest.fn(async (...args) => {
          (name === 'moderators' ? moderatorSets : authorSets).push([
            id,
            ...args,
          ]);
        }),
        get: jest.fn(async () => {
          authorGets.push([name, id]);
          return { exists: id === 'existing-author' };
        }),
      }),
    }),
  };
  const allowEffects = Object.freeze({ invocation: 1 });

  await writeModeratorReputations(
    allowEffects,
    db,
    [
      { moderatorId: 'existing-author', reputation: 0.75 },
      { moderatorId: 'missing-author', reputation: 0.25 },
    ],
    { updatedAt: '2026-10-12T00:00:00.000Z' }
  );

  expect(moderatorSets).toEqual([
    [
      'existing-author',
      {
        moderatorReputation: 0.75,
        moderatorReputationUpdatedAt: '2026-10-12T00:00:00.000Z',
      },
      { merge: true },
    ],
    [
      'missing-author',
      {
        moderatorReputation: 0.25,
        moderatorReputationUpdatedAt: '2026-10-12T00:00:00.000Z',
      },
      { merge: true },
    ],
  ]);
  expect(authorGets).toEqual([
    ['authors', 'existing-author'],
    ['authors', 'missing-author'],
  ]);
  expect(authorSets).toEqual([
    ['existing-author', { dirty: true }, { merge: true }],
  ]);
});
