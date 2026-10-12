import { describe, expect, it, jest } from '@jest/globals';
import { initializeFirebaseApp } from '../../../src/cloud/get-author-uuid-v2/startup-effect-adapter.js';

describe('get-author-uuid-v2 startup effect adapter', () => {
  it('initializes Firebase through the startup capability adapter', () => {
    const permission = Object.freeze({ startup: true });
    const initializeApp = jest.fn(() => ({ initialized: true }));

    expect(initializeFirebaseApp(permission, initializeApp)).toEqual({
      initialized: true,
    });
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
