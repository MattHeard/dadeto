import { expect, jest, test } from '@jest/globals';
import { createAssignModerationJobEntrypoint } from '../../../../src/core/cloud/assign-moderation-job/index.js';

const idTokenKey = 'id_token';

test('assignment and response receive separate request-time permissions', async () => {
  const permissions = [];
  const moderatorSet = jest.fn().mockResolvedValue(undefined);
  /** @type {(req: import('../../../../types/native-http').NativeHttpRequest, res: import('../../../../types/native-http').NativeHttpResponse) => Promise<void>} */
  let requestHandler = async () => {};
  const candidate = { ref: { path: 'variants/one' }, data: () => ({}) };
  const database = {
    collectionGroup: () => ({
      get: async () => ({ docs: [candidate] }),
    }),
    collection: name =>
      name === 'moderationRatings'
        ? { where: () => ({ get: async () => ({ docs: [] }) }) }
        : {
            doc: () => ({
              set: moderatorSet,
              get: async () => ({ exists: false }),
            }),
          },
  };
  const app = {
    use: jest.fn(),
    post: (path, handler) => {
      requestHandler = handler;
    },
  };
  const express = Object.assign(() => app, { urlencoded: () => ({}) });
  const functions = {
    region: () => ({ https: { onRequest: handler => handler } }),
  };
  const auth = {
    verifyIdToken: async () => ({ uid: 'moderator-1' }),
    getUser: async () => ({ uid: 'moderator-1' }),
  };

  await createAssignModerationJobEntrypoint({
    functions,
    express,
    cors: () => ({}),
    initializeApp: () => ({}),
    initializeFirebaseApp: (_permission, initialize) => initialize(),
    getAuth: () => auth,
    getFirestore: () => database,
    getEnvironmentVariables: () => ({
      DENDRITE_ENVIRONMENT: 'prod',
      DATABASE_ID: 'prod-db',
    }),
    now: () => 'timestamp',
    random: () => 0,
    bindEffectBoundary: handler => {
      const permission = Object.freeze({ boundary: permissions.length });
      permissions.push(permission);
      return handler(permission);
    },
    useMiddleware: (_permission, target, middleware) => target.use(middleware),
    registerPostRoute: (_permission, target, path, handler) =>
      target.post(path, handler),
    setModeratorAssignment: (_permission, reference, assignment) =>
      reference.set(assignment, { merge: true }),
    sendHttpResponse: (_permission, response, status, body) =>
      response.status(status).send(body),
  });

  const response = { status: jest.fn().mockReturnThis(), send: jest.fn() };
  await requestHandler(
    { method: 'POST', body: { [idTokenKey]: 'valid-token' } },
    response
  );

  expect(moderatorSet).toHaveBeenCalledWith(
    { variant: candidate.ref, createdAt: 'timestamp' },
    { merge: true }
  );
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.send).toHaveBeenCalledWith('');
  expect(permissions[4]).not.toBe(permissions[5]);
});
