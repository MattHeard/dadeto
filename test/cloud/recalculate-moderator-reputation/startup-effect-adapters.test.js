import { jest } from '@jest/globals';
import {
  initializeModeratorReputationFirebase,
  registerModeratorReputationSchedule,
} from '../../../src/cloud/recalculate-moderator-reputation/startup-effect-adapters.js';

test('initializes Firebase through a permission-first adapter', () => {
  const permission = Object.freeze({ invocation: true });
  const ensureFirebaseApp = jest.fn();

  initializeModeratorReputationFirebase(permission, ensureFirebaseApp);

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
});

test('registers the daily schedule through a permission-first adapter', () => {
  const permission = Object.freeze({ startup: true });
  const handler = jest.fn();
  const onRun = jest.fn(() => 'registered-function');
  const schedule = jest.fn(() => ({ onRun }));
  const region = jest.fn(() => ({ pubsub: { schedule } }));

  expect(
    registerModeratorReputationSchedule(permission, { region }, handler)
  ).toBe('registered-function');
  expect(region).toHaveBeenCalledWith('europe-west1');
  expect(schedule).toHaveBeenCalledWith('every 24 hours');
  expect(onRun).toHaveBeenCalledWith(handler);
});
