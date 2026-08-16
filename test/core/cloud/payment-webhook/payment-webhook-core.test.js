import {
  createResolveApiKeyUuid,
  createPaymentWebhookHandler,
  extractPaymentEvent,
  extractHeader,
  extractRawPayload,
  defaultGetAmountFromEvent,
  firstNonEmptyString,
  parsePositiveInteger,
  parseJsonEvent,
  readMetadata,
  safeEqual,
} from '../../../../src/core/payment-webhook-core.js';
import { parseStripePaymentWebhookEvent } from '../../../../src/core/cloud/payment-webhook/payment-webhook-core.js';
import { createFakeFirestore } from '../../../../src/core/local/gcp-simulator/fake-firestore.js';
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
            metadata: { api_key_uuid: 'uuid-direct' },
            client_reference_id: 'uuid-client',
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

    await expect(handler({ body: {} })).resolves.toEqual({
      status: 200,
      body: { ignored: true, type: 'customer.created' },
    });
  });

  it('uses the default duplicate and process handlers when none are supplied', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-defaults',
      getPaymentEvent: async () => ({
        id: 'evt_defaults',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { credit_amount: '5' } } },
      }),
    });

    await expect(handler({ body: {} })).resolves.toEqual({
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
        data: { object: { metadata: { credit_amount: '1' } } },
      }),
    });

    await expect(handler()).resolves.toBe(response);
    expect(markProcessedEvent).toHaveBeenLastCalledWith(
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
          data: { object: { metadata: { credit_amount: '1' } } },
        }),
      });

      await expect(handler()).resolves.toBe(response);
      expect(markProcessedEvent).toHaveBeenLastCalledWith(
        expect.anything(),
        'api-key-fallback',
        expectedStatus
      );
    }
  );

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
      handlePurchaseEvent: async receivedEvent => {
        expect(receivedEvent).toBe(event);
        return purchaseResponse;
      },
      getPaymentEvent: async () => event,
    });

    await expect(handler({ body: event })).resolves.toBe(purchaseResponse);
    expect(markProcessedEvent).toHaveBeenNthCalledWith(
      1,
      event,
      'purchase',
      'received'
    );
    expect(markProcessedEvent).toHaveBeenNthCalledWith(
      2,
      event,
      'purchase',
      'applied'
    );
  });

  it('supports a missing request object and metadata coercion', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-no-arg',
      getPaymentEvent: async () => ({
        id: 'evt_no_arg',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            metadata: { credit_amount: 7, ignored: true },
          },
        },
      }),
    });

    await expect(handler()).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid credit amount',
    });
  });

  it('uses the default payment event extractor when none is supplied', async () => {
    const database = createFakeFirestore();
    const applyCreditEvent = createApplyCreditEvent(database);
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async () => 'api-key-default-extractor',
    });

    await expect(
      handler({
        body: {
          id: 'evt_default_extractor',
          type: 'payment_intent.succeeded',
          data: { object: { metadata: { credit_amount: '9' } } },
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
    const applyCreditEvent = createApplyCreditEvent(database);
    const event = {
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      created: 1710000000,
      data: {
        object: {
          client_reference_id: 'api-key-uuid',
          metadata: { credit_amount: '250' },
        },
      },
    };
    const handler = createPaymentWebhookHandler({
      fetchCredit: async () => 0,
      applyCreditEvent,
      resolveApiKeyUuid: async paymentEvent =>
        paymentEvent.data.object.client_reference_id,
      isDuplicateEvent: async () => false,
      markProcessedEvent: jest.fn(),
      getPaymentEvent: async () => event,
    });

    await expect(handler({ body: event })).resolves.toEqual({
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
    const applyCreditEvent = createApplyCreditEvent(database);
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
            metadata: { credit_amount: '25' },
          },
        },
      }),
    });

    await expect(handler({ body: {} })).resolves.toEqual({
      status: 200,
      body: {
        credit: 75,
        type: 'credit_deducted',
        eventId: 'evt_refund_1',
        applied: true,
      },
    });
    expect(markProcessedEvent).toHaveBeenCalledWith(
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
        data: { object: { metadata: { credit_amount: '10' } } },
      }),
    });

    await expect(duplicateHandler({ body: {} })).resolves.toEqual({
      status: 200,
      body: { duplicate: true, eventId: 'evt_duplicate' },
    });
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

    await expect(handler({ body: {} })).resolves.toEqual({
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
        data: { object: { client_reference_id: 'api-key-uuid', metadata: {} } },
      }),
    });

    await expect(invalidAmountHandler({ body: {} })).resolves.toEqual({
      status: 400,
      body: 'Missing or invalid credit amount',
    });
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
        data: { object: { metadata: { credit_amount: '18' } } },
      })
    ).toBe(18);
    expect(
      defaultGetAmountFromEvent({
        id: 'evt_helper_missing',
        type: 'payment_intent.succeeded',
      })
    ).toBe(0);
  });

  it('covers webhook payload and signature helpers', () => {
    const payload =
      '{"id":"evt_helper_payload","type":"payment_intent.succeeded"}';
    const raw = Buffer.from(payload);
    expect(extractRawPayload({ rawBody: payload })).toBe(payload);
    expect(
      extractRawPayload({
        rawBody: raw,
        headers: { 'payment-signature': 't=1,v1=2' },
      })
    ).toBe(payload);
    expect(
      extractRawPayload({
        body: { id: 'evt_helper_payload_2', type: 'payment_intent.succeeded' },
      })
    ).toContain('evt_helper_payload_2');
    expect(
      extractRawPayload({
        body: 'plain-payload',
      })
    ).toBe('plain-payload');
    expect(
      extractHeader(
        { headers: { 'payment-signature': 'sig', 'x-test': 'value' } },
        'payment-signature'
      )
    ).toBe('sig');
    expect(extractHeader({}, 'missing')).toBe('');
    expect(extractRawPayload({})).toBe('');
    expect(extractHeader({ headers: {} }, 'missing')).toBe('');
    expect(
      parseJsonEvent('{"id":"evt_json","type":"payment_intent.succeeded"}')
    ).toMatchObject({
      id: 'evt_json',
    });
    expect(() => parseJsonEvent('{"type":"payment_intent.succeeded"}')).toThrow(
      'Invalid payment event payload'
    );
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('ab', 'abc')).toBe(false);
  });
});

describe('payment webhook cloud wrapper', () => {
  it('requires Stripe verification before parsing an event', async () => {
    const event = {
      id: 'evt_wrapper',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { credit_amount: '3' } } },
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
