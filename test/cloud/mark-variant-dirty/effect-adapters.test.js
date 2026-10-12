import { describe, expect, it, jest } from '@jest/globals';
import {
  initializeFirebaseApp,
  registerPostRoute,
  updateDocument,
  useMiddleware,
} from '../../../src/cloud/mark-variant-dirty/effect-adapters.js';

describe('mark-variant-dirty startup effect adapters', () => {
  it('initializes Firebase using the supplied capability', () => {
    const permission = Object.freeze({ scope: 'startup' });
    const initializeApp = jest.fn(() => ({ initialized: true }));

    expect(initializeFirebaseApp(permission, initializeApp)).toEqual({
      initialized: true,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('registers middleware and a POST route', () => {
    const permission = Object.freeze({ scope: 'startup' });
    const app = { use: jest.fn(), post: jest.fn() };
    const middleware = jest.fn();
    const handler = jest.fn();

    useMiddleware(permission, app, middleware);
    registerPostRoute(permission, app, '/', handler);

    expect(app.use).toHaveBeenCalledWith(middleware);
    expect(app.post).toHaveBeenCalledWith('/', handler);
  });

  it('updates a Firestore document through the permission-first adapter', async () => {
    const permission = Object.freeze({ scope: 'request' });
    const update = jest.fn().mockResolvedValue(undefined);
    const reference = { update };

    await updateDocument(permission, reference, { dirty: true });

    expect(update).toHaveBeenCalledWith({ dirty: true });
  });
});
