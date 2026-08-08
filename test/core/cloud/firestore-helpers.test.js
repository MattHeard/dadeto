import { jest } from '@jest/globals';
import {
  createFirestoreInstance,
  getFirestoreForDatabase,
  resolveFirestoreDatabaseId,
} from '../../../src/core/cloud/firestore-helpers.js';

describe('firestore helpers', () => {
  describe('resolveFirestoreDatabaseId', () => {
    it('prefers a non-empty explicit database id', () => {
      expect(
        resolveFirestoreDatabaseId({
          DATABASE_ID: 'custom-db',
          DENDRITE_ENVIRONMENT: 't-preview',
        })
      ).toBe('custom-db');
    });

    it('uses a t-* deployment environment when no explicit id exists', () => {
      expect(resolveFirestoreDatabaseId({ DENDRITE_ENVIRONMENT: 't-preview' })).toBe(
        't-preview'
      );
    });

    it.each([
      {},
      { DATABASE_ID: '   ' },
      { DATABASE_ID: 42 },
      { DENDRITE_ENVIRONMENT: 'production' },
    ])('rejects an unconfigured environment (%o)', environment => {
      expect(() => resolveFirestoreDatabaseId(environment)).toThrow(
        'Firestore database id is required'
      );
    });
  });

  it('selects a named database with or without an app', () => {
    const firestoreFactory = jest.fn((app, id) => ({ app, id }));
    const app = { name: 'app' };

    expect(getFirestoreForDatabase(firestoreFactory, app, 'named')).toEqual({
      app,
      id: 'named',
    });
    expect(getFirestoreForDatabase(firestoreFactory, null, 'named')).toEqual({
      app: undefined,
      id: 'named',
    });
  });

  it('uses the default database path for default or missing ids', () => {
    const firestoreFactory = jest.fn((app, id) => ({ app, id }));
    const app = { name: 'app' };

    expect(getFirestoreForDatabase(firestoreFactory, app, '(default)')).toEqual({
      app,
      id: undefined,
    });
    expect(getFirestoreForDatabase(firestoreFactory, app, null)).toEqual({
      app,
      id: undefined,
    });
  });

  it('creates an instance through the named database path', () => {
    const firestoreFactory = jest.fn(() => 'firestore');
    expect(createFirestoreInstance(firestoreFactory, 'created-db')).toBe(
      'firestore'
    );
    expect(firestoreFactory).toHaveBeenCalledWith(undefined, 'created-db');
  });
});
