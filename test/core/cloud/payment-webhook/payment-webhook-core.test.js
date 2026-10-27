import {
  createResolveApiKeyUuid,
  createPaymentWebhookHandler,
  extractPaymentEvent,
  defaultGetAmountFromEvent,
  firstNonEmptyString,
  parsePositiveInteger,
  readMetadata,
} from '../../../../src/core/payment-webhook-core.js';
import { parseStripePaymentWebhookEvent } from '../../../../src/core/cloud/payment-webhook/payment-webhook-core.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

const apiKeyUuidKey = 'api_key_uuid';
const clientReferenceIdKey = 'client_reference_id';
const creditAmountKey = 'credit_amount';
const allowEffects = createAllowEffects();

/**
 * Create token-checking transaction adapters around the fake database.
 * @param {ReturnType<typeof createFakeFirestore>} database Test database.
 * @returns {import('../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js').CreditEventEffects} Transaction effects.
 */
function createTransactionEffects(database) {
  return {
    runTransaction: (permission, updateFunction) => {
      expect(permission).toBe(allowEffects);
      return database.runTransaction(updateFunction);
    },
    getTransactionDocument: (transaction, reference) => {
      return transaction.get(reference);
    },
    setTransactionDocument: (permission, transaction, reference, data) => {
      expect(permission).toBe(allowEffects);
      return transaction.set(reference, data);
    },
  };
}
import { createApplyCreditEvent } from '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js';
import { jest } from '@jest/globals';

describe('createResolveApiKeyUuid', () => {
  it('prefers direct metadata and client reference ids', async () => {
    const resolver = createResolveApiKeyUuid({
      findApiKeyUuidByCustomerId: jest.fn(),
    });

    await expect(
      resolver({
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { [apiKeyUuidKey]: 'uuid-direct' },
            [clientReferenceIdKey]: 'uuid-client',
          },
        },
      })
    ).resolves.toBe('uuid-direct');
  });

  it('falls back to stored customer mappings', async () => {
    const findApiKeyUuidByCustomerId = jest
      .fn()
      .mockResolvedValue('uuid-from-customer');
    const resolver = createResolveApiKeyUuid({
      findApiKeyUuidByCustomerId,
    });

    await expect(
      resolver({
        id: 'evt_2',
        type: 'payment_intent.succeeded',
        data: { object: { customer: 'cus_123' } },
      })
    ).resolves.toBe('uuid-from-customer');

    expect(findApiKeyUuidByCustomerId).toHaveBeenCalledWith('cus_123');
  });

  it('returns null when no api key mapping exists', async () => {
    await expect(
      createResolveApiKeyUuid()({
        id: 'evt_default_resolver',
        type: 'checkout.session.completed',
      })
    ).resolves.toBeNull();

    await expect(
      createResolveApiKeyUuid()({
        id: 'evt_default_resolver_customer',
        type: 'payment_intent.succeeded',
        data: { object: { customer: 'cus_default' } },
      })
    ).resolves.toBeNull();

    const resolver = createResolveApiKeyUuid({
      findApiKeyUuidByCustomerId: jest.fn().mockResolvedValue(null),
    });

    await expect(
      resolver({
        id: 'evt_3',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      })
    ).resolves.toBeNull();

    await expect(
      resolver({
        id: 'evt_4',
        type: 'checkout.session.completed',
      })
    ).resolves.toBeNull();
  });
});

describe('createPaymentWebhookHandler', () => {
  it('rejects missing dependencies', () => {
    expect(() => createPaymentWebhookHandler()).toThrow(
      new TypeError('fetchCredit must be a function')
    );
  });

  it('ignores unsupported payment events', async () => {
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key-uuid',
      getPaymentEvent: async () => ({
        id: 'evt_ignored',
        type: 'customer.created',
        data: { object: {} },
      }),
    });

    await expect(handler(allowEffects, { body: {} })).resolves.toEqual({
      status: 200,
      body: { ignored: true, type: 'customer.created' },
    });
  });

  it('uses the default duplicate and process handlers when none are supplied', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(
      database,
      createTransactionEffects(database)
    );
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-defaults',
      getPaymentEvent: async () => ({
        id: 'evt_defaults',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { [creditAmountKey]: '5' } } },
      }),
    });

    await expect(handler(allowEffects, { body: {} })).resolves.toEqual({
      status: 201,
      body: {
        credit: 5,
        type: 'credit_added',
        eventId: 'evt_defaults',
        applied: true,
      },
    });
  });

  it.each([
    [{ deferred: true }, 'deferred'],
    [{ quarantined: true }, 'quarantined'],
    [{ ignored: true }, 'ignored'],
    [{ duplicate: true }, 'ignored'],
    [{}, 'applied'],
  ])('records response body status %j as %s', async (body, expectedStatus) => {
    const markProcessedEvent = jest.fn();
    const response = { status: 200, body };
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: async () => response,
      resolveApiKeyUuid: async () => 'api-key-status',
      markProcessedEvent,
      getPaymentEvent: async () => ({
        id: `evt_${expectedStatus}`,
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { [creditAmountKey]: '1' } } },
      }),
    });

    await expect(handler(allowEffects)).resolves.toBe(response);
    expect(markProcessedEvent).toHaveBeenLastCalledWith(
      allowEffects,
      expect.anything(),
      'api-key-status',
      expectedStatus
    );
  });

  it.each([
    [{ body: 'plain', status: 200 }, 'applied'],
    [{ body: {}, status: 500 }, 'quarantined'],
  ])(
    'records fallback response status %j as %s',
    async (response, expectedStatus) => {
      const markProcessedEvent = jest.fn();
      const handler = createPaymentWebhookHandler({
        fetchCredit: async () => 0,
        applyCreditEvent: async () => response,
        resolveApiKeyUuid: async () => 'api-key-fallback',
        markProcessedEvent,
        getPaymentEvent: async () => ({
          id: `evt_${expectedStatus}_fallback`,
          type: 'payment_intent.succeeded',
          data: { object: { metadata: { [creditAmountKey]: '1' } } },
        }),
      });

      await expect(handler(allowEffects)).resolves.toBe(response);
      expect(markProcessedEvent).toHaveBeenLastCalledWith(
        allowEffects,
        expect.anything(),
        'api-key-fallback',
        expectedStatus
      );
    }
  );
});

describe('createPaymentWebhookHandler processing', () => {
  it('does not recursively rescan when a replay event is already a duplicate', async () => {
    const currentEvent = {
      id: 'evt-current-success',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { ['purchase_id']: 'purchase-duplicate' } } },
    };
    const deferredEvent = {
      id: 'evt-already-processed',
      type: 'refund.updated',
      data: { object: { metadata: { ['purchase_id']: 'purchase-duplicate' } } },
    };
    const readDeferredPaymentEvents = jest
      .fn()
      .mockResolvedValueOnce([deferredEvent])
      .mockResolvedValueOnce([]);
    const handlePurchaseEvent = jest.fn(async (_permission, event) => ({
      status: 200,
      body: { applied: event.id === currentEvent.id },
    }));
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key',
      isDuplicateEvent: async eventId => eventId === deferredEvent.id,
      allowedEventTypes: new Set([
        'payment_intent.succeeded',
        'refund.updated',
      ]),
      handlePurchaseEvent,
      readDeferredPaymentEvents,
      getPaymentEvent: async () => currentEvent,
    });

    await expect(handler(allowEffects)).resolves.toMatchObject({
      body: { applied: true },
    });
    expect(readDeferredPaymentEvents).toHaveBeenCalledTimes(1);
    expect(handlePurchaseEvent).toHaveBeenCalledTimes(1);
  });

  it('keeps unresolved events deferred and stops rescanning', async () => {
    const currentEvent = {
      id: 'evt-current-transition',
      type: 'payment_intent.succeeded',
      data: {
        object: { metadata: { ['purchase_id']: 'purchase-unresolved' } },
      },
    };
    const deferredEvent = {
      id: 'evt-still-pending',
      type: 'refund.updated',
      data: {
        object: { metadata: { ['purchase_id']: 'purchase-unresolved' } },
      },
    };
    const readDeferredPaymentEvents = jest.fn(async () => [deferredEvent]);
    const markProcessedEvent = jest.fn();
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key',
      allowedEventTypes: new Set([
        'payment_intent.succeeded',
        'refund.updated',
      ]),
      handlePurchaseEvent: async (_permission, event) =>
        event.id === deferredEvent.id
          ? { status: 200, body: { deferred: true } }
          : { status: 200, body: { applied: true } },
      readDeferredPaymentEvents,
      markProcessedEvent,
      getPaymentEvent: async () => currentEvent,
    });

    await handler(allowEffects);
    expect(readDeferredPaymentEvents).toHaveBeenCalledTimes(1);
    expect(markProcessedEvent).toHaveBeenCalledWith(
      allowEffects,
      deferredEvent,
      'api-key',
      'deferred'
    );
  });

  it('uses an empty default deferred reader after a purchase transition', async () => {
    let event = {
      id: 'evt-default-reader',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { ['purchase_id']: 'purchase-default' } } },
    };
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key',
      allowedEventTypes: new Set(['payment_intent.succeeded']),
      handlePurchaseEvent: async () => ({
        status: 200,
        body: { applied: true },
      }),
      getPaymentEvent: async () => event,
    });

    await expect(handler(allowEffects)).resolves.toMatchObject({
      body: { applied: true },
    });
    event = {
      id: 'evt-no-purchase-metadata',
      type: 'payment_intent.succeeded',
      data: {},
    };
    await expect(handler(allowEffects)).resolves.toMatchObject({
      body: { applied: true },
    });
  });

  it('replays deferred events for the same purchase after a successful transition', async () => {
    const currentEvent = {
      id: 'evt-payment-success',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { ['purchase_id']: 'purchase-1' } } },
    };
    const deferredEvent = {
      id: 'evt-refund-deferred',
      type: 'refund.updated',
      created: 10,
      data: { object: { metadata: { ['purchase_id']: 'purchase-1' } } },
    };
    const unrelatedEvent = {
      id: 'evt-other-purchase',
      type: 'refund.updated',
      created: 5,
      data: { object: { metadata: { ['purchase_id']: 'purchase-2' } } },
    };
    const readDeferredPaymentEvents = jest
      .fn()
      .mockResolvedValueOnce([deferredEvent])
      .mockResolvedValueOnce([]);
    const handlePurchaseEvent = jest.fn(async (_permission, event) =>
      event.id === deferredEvent.id
        ? { status: 200, body: { applied: true } }
        : { status: 200, body: { applied: true } }
    );
    const markProcessedEvent = jest.fn();
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key',
      allowedEventTypes: new Set([
        'payment_intent.succeeded',
        'refund.updated',
      ]),
      handlePurchaseEvent,
      readDeferredPaymentEvents,
      markProcessedEvent,
      getPaymentEvent: async () => currentEvent,
    });

    await expect(handler(allowEffects)).resolves.toMatchObject({
      status: 200,
      body: { applied: true },
    });
    expect(readDeferredPaymentEvents).toHaveBeenCalledTimes(2);
    expect(readDeferredPaymentEvents).toHaveBeenCalledWith(
      allowEffects,
      'purchase-1'
    );
    expect(handlePurchaseEvent.mock.calls.map(([, event]) => event.id)).toEqual(
      [currentEvent.id, deferredEvent.id]
    );
    expect(handlePurchaseEvent).not.toHaveBeenCalledWith(
      allowEffects,
      unrelatedEvent
    );
    expect(markProcessedEvent).toHaveBeenCalledWith(
      allowEffects,
      deferredEvent,
      'api-key',
      'applied'
    );
  });

  it('durably dispatches individual Stripe refund events', async () => {
    const markProcessedEvent = jest.fn();
    for (const type of ['refund.created', 'refund.updated']) {
      const event = { id: `evt_${type}`, type, data: { object: {} } };
      const response = { status: 200, body: { deferred: true } };
      const handler = createPaymentWebhookHandler({
        fetchCredit: async () => 0,
        applyCreditEvent: jest.fn(),
        resolveApiKeyUuid: async () => null,
        markProcessedEvent,
        handlePurchaseEvent: async () => response,
        getPaymentEvent: async () => event,
      });

      await expect(handler(allowEffects)).resolves.toBe(response);
      expect(markProcessedEvent).toHaveBeenNthCalledWith(
        markProcessedEvent.mock.calls.length - 1,
        allowEffects,
        event,
        'purchase',
        'received'
      );
      expect(markProcessedEvent).toHaveBeenLastCalledWith(
        allowEffects,
        event,
        'purchase',
        'deferred'
      );
    }
  });

  it('records purchase events and uses a fallback processed-event key', async () => {
    const markProcessedEvent = jest.fn();
    const purchaseResponse = { status: 201, body: { purchase: true } };
    const event = {
      id: 'evt_purchase',
      type: 'checkout.session.completed',
      data: { object: {} },
    };
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => null,
      markProcessedEvent,
      handlePurchaseEvent: async (receivedAllowEffects, receivedEvent) => {
        expect(receivedAllowEffects).toBe(allowEffects);
        expect(receivedEvent).toBe(event);
        return purchaseResponse;
      },
      getPaymentEvent: async () => event,
    });

    await expect(handler(allowEffects, { body: event })).resolves.toBe(
      purchaseResponse
    );
    expect(markProcessedEvent).toHaveBeenNthCalledWith(
      1,
      allowEffects,
      event,
      'purchase',
      'received'
    );
    expect(markProcessedEvent).toHaveBeenNthCalledWith(
      2,
      allowEffects,
      event,
      'purchase',
      'applied'
    );
  });

  it('supports a missing request object and metadata coercion', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(
      database,
      createTransactionEffects(database)
    );
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-no-arg',
      getPaymentEvent: async () => ({
        id: 'evt_no_arg',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: { [creditAmountKey]: 7, ignored: true },
          },
        },
      }),
    });

    await expect(handler(allowEffects)).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid credit amount',
    });
  });

  it('uses the default payment event extractor when none is supplied', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(
      database,
      createTransactionEffects(database)
    );
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-default-extractor',
    });

    await expect(
      handler(allowEffects, {
        body: {
          id: 'evt_default_extractor',
          type: 'payment_intent.succeeded',
          data: { object: { metadata: { [creditAmountKey]: '9' } } },
        },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        credit: 9,
        type: 'credit_added',
        eventId: 'evt_default_extractor',
        applied: true,
      },
    });
  });

  it('credits the ledger for a completed checkout session', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(
      database,
      createTransactionEffects(database)
    );
    const event = {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      created: 1710000000,
      data: {
        object: {
          [clientReferenceIdKey]: 'api-key-uuid',
          metadata: { [creditAmountKey]: '250' },
        },
      },
    };
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async paymentEvent =>
        paymentEvent.data.object[clientReferenceIdKey],
      isDuplicateEvent: async () => false,
      markProcessedEvent: jest.fn(),
      getPaymentEvent: async () => event,
    });

    await expect(handler(allowEffects, { body: event })).resolves.toEqual({
      status: 201,
      body: {
        credit: 250,
        type: 'credit_added',
        eventId: 'evt_checkout_1',
        applied: true,
      },
    });
  });

  it('deducts credits for refunded charges and skips duplicates', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(
      database,
      createTransactionEffects(database)
    );
    await database.collection('api-key-credit').doc('api-key-uuid').set({
      credit: 100,
    });
    const markProcessedEvent = jest.fn();
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 1000,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-uuid',
      isDuplicateEvent: async eventId => eventId === 'evt_duplicate',
      markProcessedEvent,
      getPaymentEvent: async () => ({
        id: 'evt_refund_1',
        type: 'charge.refunded',
        data: {
          object: {
            customer: 'cus_123',
            metadata: { [creditAmountKey]: '25' },
          },
        },
      }),
    });

    await expect(handler(allowEffects, { body: {} })).resolves.toEqual({
      status: 200,
      body: {
        credit: 75,
        type: 'credit_deducted',
        eventId: 'evt_refund_1',
        applied: true,
      },
    });
    expect(markProcessedEvent).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ id: 'evt_refund_1' }),
      'api-key-uuid',
      'received'
    );

    const duplicateHandler = createPaymentWebhookHandler({
      fetchCredit: async () => 1000,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-uuid',
      isDuplicateEvent: async () => true,
      markProcessedEvent,
      getPaymentEvent: async () => ({
        id: 'evt_duplicate',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { [creditAmountKey]: '10' } } },
      }),
    });

    await expect(duplicateHandler(allowEffects, { body: {} })).resolves.toEqual(
      {
        status: 200,
        body: { duplicate: true, eventId: 'evt_duplicate' },
      }
    );
  });

  it('rejects missing mappings and invalid credit amounts', async () => {
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => null,
      isDuplicateEvent: async () => false,
      getPaymentEvent: async () => ({
        id: 'evt_missing',
        type: 'checkout.session.completed',
        data: { object: { metadata: {} } },
      }),
    });

    await expect(handler(allowEffects, { body: {} })).resolves.toEqual({
      status: 400,
      body: 'Missing api key mapping',
    });

    const invalidAmountHandler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key-uuid',
      isDuplicateEvent: async () => false,
      getPaymentEvent: async () => ({
        id: 'evt_invalid_amount',
        type: 'payment_intent.succeeded',
        data: {
          object: { [clientReferenceIdKey]: 'api-key-uuid', metadata: {} },
        },
      }),
    });

    await expect(
      invalidAmountHandler(allowEffects, { body: {} })
    ).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid credit amount',
    });
  });
});

describe('deferred payment webhook replay', () => {
  it('does not rescan after a deferred event is quarantined', async () => {
    const purchaseId = 'purchase-quarantine';
    const currentEvent = {
      id: 'evt-current-transition-quarantine',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { ['purchase_id']: purchaseId } } },
    };
    const deferredEvent = {
      id: 'evt-quarantined-replay',
      type: 'refund.updated',
      data: { object: { metadata: { ['purchase_id']: purchaseId } } },
    };
    const readDeferredPaymentEvents = jest.fn(async () => [deferredEvent]);
    const markProcessedEvent = jest.fn();
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent: jest.fn(),
      resolveApiKeyUuid: async () => 'api-key',
      allowedEventTypes: new Set([
        'payment_intent.succeeded',
        'refund.updated',
      ]),
      handlePurchaseEvent: async (_permission, event) =>
        event.id === deferredEvent.id
          ? { status: 400, body: { quarantined: true } }
          : { status: 200, body: { applied: true } },
      readDeferredPaymentEvents,
      markProcessedEvent,
      getPaymentEvent: async () => currentEvent,
    });

    await handler(allowEffects);
    expect(readDeferredPaymentEvents).toHaveBeenCalledTimes(1);
    expect(markProcessedEvent).toHaveBeenCalledWith(
      allowEffects,
      deferredEvent,
      'api-key',
      'quarantined'
    );
  });
});

describe('extractPaymentEvent', () => {
  it('parses a payment body object and rejects malformed requests', async () => {
    await expect(
      extractPaymentEvent({
        body: {
          id: 'evt_parse',
          type: 'payment_intent.succeeded',
          data: { object: {} },
        },
      })
    ).resolves.toMatchObject({ id: 'evt_parse' });

    await expect(extractPaymentEvent(null)).rejects.toThrow(
      'request must be an object'
    );
    await expect(extractPaymentEvent({ body: {} })).rejects.toThrow(
      'request body must be a payment event object'
    );
    await expect(extractPaymentEvent({ body: 'plain text' })).rejects.toThrow(
      'request body must be a payment event object'
    );
  });
});

describe('helper exports', () => {
  it('covers amount parsing and metadata helpers', () => {
    expect(parsePositiveInteger('12')).toBe(12);
    expect(parsePositiveInteger('0')).toBe(0);
    expect(firstNonEmptyString(['', null, 'x'])).toBe('x');
    expect(firstNonEmptyString([])).toBe('');
    expect(
      readMetadata({ metadata: { foo: 'bar', num: 1, empty: '' } })
    ).toEqual({ foo: 'bar' });
    expect(readMetadata({})).toEqual({});
    expect(
      defaultGetAmountFromEvent({
        id: 'evt_helper',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { [creditAmountKey]: '18' } } },
      })
    ).toBe(18);
    expect(
      defaultGetAmountFromEvent({
        id: 'evt_helper_missing',
        type: 'payment_intent.succeeded',
      })
    ).toBe(0);
  });
});

describe('payment webhook cloud wrapper', () => {
  it('requires Stripe verification before parsing an event', async () => {
    const event = {
      id: 'evt_wrapper',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { [creditAmountKey]: '3' } } },
    };
    const constructEvent = jest.fn(() => event);
    expect(
      parseStripePaymentWebhookEvent(
        {
          rawBody: JSON.stringify(event),
          headers: {
            'stripe-signature': 'signed',
          },
        },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        constructEvent
      )
    ).toMatchObject({ id: 'evt_wrapper' });
    expect(constructEvent).toHaveBeenCalledWith(
      JSON.stringify(event),
      'signed',
      'secret'
    );
  });

  it('requires raw bytes and signature even in ephemeral test environments', () => {
    const event = {
      id: 'evt_unsigned_fixture',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { [creditAmountKey]: '3' } } },
    };
    const toJSON = jest.fn(() => event);
    const constructEvent = jest.fn(() => event);

    expect(() =>
      parseStripePaymentWebhookEvent(
        { body: { toJSON } },
        {
          STRIPE_WEBHOOK_SECRET: 'secret',
          DENDRITE_ENVIRONMENT: 't-e2e-1234',
        },
        constructEvent
      )
    ).toThrow('Missing Stripe webhook payload');
    expect(toJSON).not.toHaveBeenCalled();

    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: JSON.stringify(event) },
        {
          STRIPE_WEBHOOK_SECRET: 'secret',
          DENDRITE_ENVIRONMENT: 't-e2e-1234',
        },
        constructEvent
      )
    ).toThrow('Missing Stripe signature');
    expect(constructEvent).not.toHaveBeenCalled();

    expect(() =>
      parseStripePaymentWebhookEvent(
        { body: 'not-an-object' },
        {
          STRIPE_WEBHOOK_SECRET: 'secret',
          DENDRITE_ENVIRONMENT: 't-e2e-1234',
        },
        jest.fn()
      )
    ).toThrow('Missing Stripe webhook payload');
  });

  it('fails closed for missing secret, raw body, and signature', () => {
    expect(() => parseStripePaymentWebhookEvent({}, {}, jest.fn())).toThrow(
      'Missing Stripe webhook secret'
    );
    expect(() =>
      parseStripePaymentWebhookEvent(
        {},
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        jest.fn()
      )
    ).toThrow('Missing Stripe webhook payload');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}' },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        jest.fn()
      )
    ).toThrow('Missing Stripe signature');
    expect(() =>
      parseStripePaymentWebhookEvent(
        {
          body: { id: 'evt_parsed' },
          headers: { 'stripe-signature': 'signed' },
        },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        jest.fn()
      )
    ).toThrow('Missing Stripe webhook payload');
  });

  it('rejects constructEvent failures without invoking downstream parsing', () => {
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}', headers: { 'stripe-signature': 'bad' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => {
          throw new Error('stale signature');
        }
      )
    ).toThrow('Invalid Stripe webhook signature');
  });
});
