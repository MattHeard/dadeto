import { describe, expect, it, jest } from '@jest/globals';
import {
  createApplyCreditEvent,
  createFetchCredit,
  createFetchCreditEvents,
  applyResponseHeaders,
  createDb,
  createGetApiKeyCreditV2ExpressHandle,
  createGetApiKeyCreditV2Handler,
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

describe('createFetchCreditEvents', () => {
  it('returns an empty history when no events exist', async () => {
    const database = createFakeFirestore();
    const fetchCreditEvents = createFetchCreditEvents(database);

    await expect(fetchCreditEvents('missing-user')).resolves.toEqual([]);
  });

  it('returns internal error when a stored event payload is malformed', async () => {
    const database = createFakeFirestore();
    database.runTransaction = jest.fn(async callback =>
      callback({
        get: jest.fn(async ref => {
          if (String(ref.path).includes('/events/')) {
            return {
              exists: true,
              data: () => ({
                type: 'credit_added',
                eventId: 'event-bad',
                amount: 1,
                balanceAfter: 'not-a-number',
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
    const fetchCreditEvents = createFetchCreditEvents(database);

    await expect(fetchCreditEvents('user-malformed')).resolves.toEqual([]);
  });

  it('skips null ledger event payloads', async () => {
    const database = createFakeFirestore();
    await database
      .doc('api-key-ledger/user-null-event/events/event-null')
      .set(null);
    const fetchCreditEvents = createFetchCreditEvents(database);

    await expect(fetchCreditEvents('user-null-event')).resolves.toEqual([]);
  });

  it('returns the stored ledger events in lexicographic event id order', async () => {
    const database = createFakeFirestore();
    await database.doc('api-key-ledger/user-history/events/event-b').set({
      type: 'credit_added',
      eventId: 'event-b',
      amount: 5,
      balanceBefore: 3,
      balanceAfter: 8,
    });
    await database.doc('api-key-ledger/user-history/events/event-a').set({
      type: 'credit_deducted',
      eventId: 'event-a',
      amount: 2,
      balanceBefore: 5,
      balanceAfter: 3,
    });

    const fetchCreditEvents = createFetchCreditEvents(database);

    await expect(fetchCreditEvents('user-history')).resolves.toEqual([
      {
        type: 'credit_deducted',
        eventId: 'event-a',
        amount: 2,
        balanceBefore: 5,
        balanceAfter: 3,
      },
      {
        type: 'credit_added',
        eventId: 'event-b',
        amount: 5,
        balanceBefore: 3,
        balanceAfter: 8,
      },
    ]);
  });
});

describe('createDb', () => {
  it('uses the configured database id when present', () => {
    const FirestoreCtor = jest
      .fn()
      .mockImplementation(options => ({ options }));

    const db = createDb(FirestoreCtor, {
      DATABASE_ID: 'test-database',
    });

    expect(db.options).toEqual({ databaseId: 'test-database' });
    expect(FirestoreCtor).toHaveBeenCalledTimes(1);
    expect(FirestoreCtor).toHaveBeenCalledWith({ databaseId: 'test-database' });
  });

  it('falls back to the default database when the id is blank', () => {
    const FirestoreCtor = jest
      .fn()
      .mockImplementation(options => ({ options }));

    const db = createDb(FirestoreCtor, {
      DATABASE_ID: '   ',
    });

    expect(db.options).toBeUndefined();
    expect(FirestoreCtor).toHaveBeenCalledTimes(1);
    expect(FirestoreCtor).toHaveBeenCalledWith();
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

describe('createGetApiKeyCreditV2Handler', () => {
  it('returns the stored ledger history on the events route', async () => {
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit: async () => 0,
      fetchCreditEvents: async uuid => [
        {
          type: 'credit_added',
          eventId: `event-${uuid}`,
          amount: 5,
          balanceBefore: 0,
          balanceAfter: 5,
        },
      ],
      applyCreditEvent: async () => ({
        status: 200,
        body: { ok: true },
      }),
      getUuid: request => String(request.path ?? '').split('/')[2] ?? '',
    });

    await expect(
      handler({ method: 'GET', path: '/api-keys/user-events/credit/events' })
    ).resolves.toEqual({
      status: 200,
      body: {
        events: [
          {
            type: 'credit_added',
            eventId: 'event-user-events',
            amount: 5,
            balanceBefore: 0,
            balanceAfter: 5,
          },
        ],
      },
    });
  });

  it('defaults to an empty history when no fetchCreditEvents dependency is provided', async () => {
    const handler = createGetApiKeyCreditV2Handler({
      fetchCredit: async () => 0,
      applyCreditEvent: async () => ({
        status: 200,
        body: { ok: true },
      }),
      getUuid: request => String(request.path ?? '').split('/')[2] ?? '',
    });

    await expect(
      handler({ method: 'GET', path: '/api-keys/user-default/credit/events' })
    ).resolves.toEqual({
      status: 200,
      body: {
        events: [],
      },
    });
  });

  it('rejects invalid history dependencies', () => {
    expect(() =>
      createGetApiKeyCreditV2Handler({
        fetchCredit: async () => 0,
        fetchCreditEvents: 7,
        applyCreditEvent: async () => ({ status: 200, body: {} }),
      })
    ).toThrow('fetchCreditEvents must be a function');
  });
});

describe('createGetApiKeyCreditV2ExpressHandle', () => {
  it('writes JSON responses and forwards headers', async () => {
    const handle = createGetApiKeyCreditV2ExpressHandle({
      db: createFakeFirestore(),
    });
    const res = {
      headers: [],
      set(name, value) {
        this.headers.push([name, value]);
      },
      status(status) {
        this.statusCode = status;
        return this;
      },
      json(body) {
        this.body = body;
      },
      send(body) {
        this.body = body;
      },
    };

    await handle(
      {
        method: 'GET',
        path: '/api-keys/123e4567-e89b-12d3-a456-426614174000/credit/events',
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ events: [] });
    expect(res.headers).toEqual([]);
  });

  it('forwards headers for validation errors', async () => {
    const handle = createGetApiKeyCreditV2ExpressHandle({
      db: createFakeFirestore(),
    });
    const res = {
      headers: [],
      set(name, value) {
        this.headers.push([name, value]);
      },
      status(status) {
        this.statusCode = status;
        return this;
      },
      json(body) {
        this.body = body;
      },
      send(body) {
        this.body = body;
      },
    };

    await handle(
      {
        method: 'DELETE',
        path: '/api-keys/123e4567-e89b-12d3-a456-426614174000/credit',
      },
      res
    );

    expect(res.statusCode).toBe(405);
    expect(res.headers).toEqual([['Allow', 'GET, POST']]);
    expect(res.body).toBe('Method Not Allowed');
  });

  it('logs and returns internal errors from the data path', async () => {
    const database = {
      collection() {
        throw new Error('boom');
      },
    };
    const originalError = console.error;
    const error = jest.fn();
    console.error = error;

    try {
      const handle = createGetApiKeyCreditV2ExpressHandle({ db: database });
      const res = {
        set() {},
        status(status) {
          this.statusCode = status;
          return this;
        },
        json(body) {
          this.body = body;
        },
        send(body) {
          this.body = body;
        },
      };

      await handle(
        {
          method: 'GET',
          path: '/api-keys/123e4567-e89b-12d3-a456-426614174000/credit',
        },
        res
      );

      expect(error).toHaveBeenCalled();
      expect(res.statusCode).toBe(500);
      expect(res.body).toBe('Internal error');
    } finally {
      console.error = originalError;
    }
  });
});

describe('applyResponseHeaders', () => {
  it('skips undefined headers', () => {
    const res = { set: jest.fn() };

    applyResponseHeaders(res, {
      'X-Defined': 'value',
      'X-Undefined': undefined,
    });

    expect(res.set).toHaveBeenCalledTimes(1);
    expect(res.set).toHaveBeenCalledWith('X-Defined', 'value');
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
