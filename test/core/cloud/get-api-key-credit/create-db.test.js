import {
  API_KEY_CREDIT_CREATE_DB_MARKER,
  createDb,
} from '../../../../src/core/cloud/get-api-key-credit/create-db.js';

describe('API key credit createDb facade', () => {
  it('forwards named database configuration', () => {
    class Firestore {
      constructor(options) {
        this.options = options;
      }
    }
    expect(createDb(Firestore, { DATABASE_ID: 'credit-db' }).options).toEqual({
      databaseId: 'credit-db',
    });
  });

  it('forwards default and fallback environment behavior', () => {
    class Firestore {
      constructor(options) {
        this.options = options;
      }
    }
    expect(createDb(Firestore, { DATABASE_ID: '(default)' }).options).toBeUndefined();
    expect(createDb(Firestore, { DENDRITE_ENVIRONMENT: '   ' }).options).toBeUndefined();
    expect(API_KEY_CREDIT_CREATE_DB_MARKER).toBe(true);
  });
});
