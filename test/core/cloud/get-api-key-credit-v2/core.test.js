import { describe, expect, it, jest } from '@jest/globals';
import {
  createApplyCreditEvent,
  createFetchCredit,
} from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import * as coreShim from '../../../../src/core/get-api-key-credit-v2.js';
import { getApiKeyCreditSnapshot } from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-snapshot.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';

describe('createFetchCredit', () => {
  it('returns zero when the credit document is missing', async () => {
    const database = createFakeFirestore();

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('uuid-123')).resolves.toBe(0);
  });

  it('returns zero when the snapshot data accessor is missing', async () => {
    const database = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: true }),
        }),
      }),
    };

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('uuid-123')).resolves.toBe(0);
  });

  it('returns zero when the snapshot data is not an object', async () => {
    const database = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => 7,
          }),
        }),
      }),
    };

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('uuid-123')).resolves.toBe(0);
  });

  it('returns the stored credit when the document exists', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-credit/user-456').set({ credit: 15 });

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-456')).resolves.toBe(15);
  });

  it('defaults to zero when the credit field is missing', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-credit/user-789').set({});

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-789')).resolves.toBe(0);
  });

  it('uses an empty object when the snapshot data is nullish', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-credit/user-999').set(null);

    const fetchCredit = createFetchCredit(database);
    await expect(fetchCredit('user-999')).resolves.toBe(0);
  });
});

describe('createApplyCreditEvent', () => {
  it('creates a credit event and snapshot for a new key', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-add', {
        type: 'credit_added',
        eventId: 'event-add-1',
        amount: 25,
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        credit: 25,
        type: 'credit_added',
        eventId: 'event-add-1',
        applied: true,
      },
    });

    expect(
      (await database.doc('api-key-credit/user-add').get()).data()
    ).toMatchObject({
      credit: 25,
      lastEventId: 'event-add-1',
    });
    expect(
      (
        await database.doc('api-key-ledger/user-add/events/event-add-1').get()
      ).data()
    ).toMatchObject({
      type: 'credit_added',
      eventId: 'event-add-1',
      amount: 25,
      balanceBefore: 0,
      balanceAfter: 25,
    });
  });

  it('rejects deducting credit for an unknown key', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-missing', {
        type: 'credit_deducted',
        eventId: 'event-deduct-missing',
        amount: 3,
      })
    ).resolves.toEqual({
      status: 404,
      body: 'Not found',
    });

    expect(
      await database
        .doc('api-key-ledger/user-missing/events/event-deduct-missing')
        .get()
    ).toMatchObject({ exists: false });
  });

  it('rejects overdrafts without mutating the ledger', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-credit/user-overdraft').set({ credit: 10 });
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-overdraft', {
        type: 'credit_deducted',
        eventId: 'event-deduct-over',
        amount: 11,
      })
    ).resolves.toEqual({
      status: 409,
      body: 'Insufficient credit',
    });

    expect(
      (await database.doc('api-key-credit/user-overdraft').get()).data()
    ).toMatchObject({
      credit: 10,
    });
    expect(
      await database
        .doc('api-key-ledger/user-overdraft/events/event-deduct-over')
        .get()
    ).toMatchObject({ exists: false });
  });

  it('deducts credit when enough balance exists', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-credit/user-deduct').set({ credit: 10 });
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-deduct', {
        type: 'credit_deducted',
        eventId: 'event-deduct-1',
        amount: 4,
      })
    ).resolves.toEqual({
      status: 200,
      body: {
        credit: 6,
        type: 'credit_deducted',
        eventId: 'event-deduct-1',
        applied: true,
      },
    });

    expect(
      (await database.doc('api-key-credit/user-deduct').get()).data()
    ).toMatchObject({
      credit: 6,
      lastEventId: 'event-deduct-1',
    });
  });

  it('replays the same event id without double-applying it', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);
    const event = {
      type: 'credit_added',
      eventId: 'event-idempotent',
      amount: 8,
    };

    await expect(applyCreditEvent('user-idempotent', event)).resolves.toEqual({
      status: 201,
      body: {
        credit: 8,
        type: 'credit_added',
        eventId: 'event-idempotent',
        applied: true,
      },
    });
    await expect(applyCreditEvent('user-idempotent', event)).resolves.toEqual({
      status: 201,
      body: {
        credit: 8,
        type: 'credit_added',
        eventId: 'event-idempotent',
        applied: true,
      },
    });

    expect(
      (await database.doc('api-key-credit/user-idempotent').get()).data()
    ).toMatchObject({
      credit: 8,
      lastEventId: 'event-idempotent',
    });
    expect(
      (
        await database
          .doc('api-key-ledger/user-idempotent/events/event-idempotent')
          .get()
      ).data()
    ).toMatchObject({
      balanceAfter: 8,
      balanceBefore: 0,
      amount: 8,
    });
  });

  it('returns 500 when the stored ledger event has no data accessor', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
            };
          }

          return {
            exists: true,
            data: () => ({ credit: 1 }),
          };
        }),
        set: jest.fn(),
      })
    );
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-malformed', {
        type: 'credit_added',
        eventId: 'event-malformed',
        amount: 1,
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
  });

  it('returns 500 when the stored ledger event data is nullish', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
              data: () => null,
            };
          }

          return {
            exists: true,
            data: () => ({ credit: 1 }),
          };
        }),
        set: jest.fn(),
      })
    );
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-nullish', {
        type: 'credit_added',
        eventId: 'event-nullish',
        amount: 1,
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
  });

  it('returns 500 when the stored ledger event data is not an object', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
              data: () => 7,
            };
          }

          return {
            exists: true,
            data: () => ({ credit: 1 }),
          };
        }),
        set: jest.fn(),
      })
    );
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-not-object', {
        type: 'credit_added',
        eventId: 'event-not-object',
        amount: 1,
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
  });

  it('returns 500 when the stored event payload is structurally invalid', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
              data: () => ({
                type: 'credit_added',
                eventId: 'event-invalid',
                amount: 1,
                balanceAfter: 'nope',
              }),
            };
          }

          return {
            exists: true,
            data: () => ({ credit: 1 }),
          };
        }),
        set: jest.fn(),
      })
    );
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-invalid', {
        type: 'credit_added',
        eventId: 'event-invalid',
        amount: 1,
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
  });

  it('returns 500 when the stored ledger event type is missing', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
              data: () => ({
                eventId: 'event-missing-type',
                amount: 1,
                balanceAfter: 1,
              }),
            };
          }

          return {
            exists: true,
            data: () => ({ credit: 1 }),
          };
        }),
        set: jest.fn(),
      })
    );
    const applyCreditEvent = createApplyCreditEvent(database);

    await expect(
      applyCreditEvent('user-missing-type', {
        type: 'credit_added',
        eventId: 'event-missing-type',
        amount: 1,
      })
    ).resolves.toEqual({
      status: 500,
      body: 'Internal error',
    });
  });
});

describe('getApiKeyCreditSnapshot', () => {
  it('requests the document using the api-key-credit collection', async () => {
    const get = jest.fn().mockResolvedValue('snapshot');
    const doc = jest.fn().mockReturnValue({ get });
    const collection = jest.fn().mockReturnValue({ doc });
    const database = { collection };

    const promise = getApiKeyCreditSnapshot(database, 9876);

    expect(collection).toHaveBeenCalledWith('api-key-credit');
    expect(doc).toHaveBeenCalledWith('9876');
    await expect(promise).resolves.toBe('snapshot');
  });
});

describe('core shim', () => {
  it('re-exports the credit V2 core helpers from the shared root module', () => {
    expect(coreShim.createFetchCredit).toBe(createFetchCredit);
    expect(coreShim.createApplyCreditEvent).toBe(createApplyCreditEvent);
  });
});
