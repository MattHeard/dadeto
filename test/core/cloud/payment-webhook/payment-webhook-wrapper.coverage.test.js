import { jest } from '@jest/globals';

let mockDb;
let mockBilling;
const mockCreatePaymentWebhookHandler = jest.fn();
const mockDomainHandler = jest.fn(async request => ({
  status: 200,
  body: { request },
}));

await jest.unstable_mockModule(
  '../../../../src/core/cloud/get-api-key-credit-v2/create-db.js',
  () => ({ createDb: () => mockDb })
);
await jest.unstable_mockModule(
  '../../../../src/core/cloud/billing/billing-runtime-core.js',
  () => ({
    createBillingRuntime: () => mockBilling,
  })
);
await jest.unstable_mockModule(
  '../../../../src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js',
  () => ({
    createApplyCreditEvent: jest.fn(() => jest.fn()),
    createFetchCredit: jest.fn(() => jest.fn()),
    createResolveApiKeyUuid: options => options.findApiKeyUuidByCustomerId,
  })
);
await jest.unstable_mockModule(
  '../../../../src/core/payment-webhook-core.js',
  () => ({
    createPaymentWebhookHandler: (...args) => {
      mockCreatePaymentWebhookHandler(...args);
      return mockDomainHandler;
    },
    createResolveApiKeyUuid: options => options.findApiKeyUuidByCustomerId,
    extractHeader: (request, name) => request?.headers?.[name] ?? '',
    extractRawPayload: request => request?.rawBody ?? request?.body ?? '',
    parseJsonEvent: payload => JSON.parse(payload),
    readMetadata: jest.fn(event => event.metadata ?? {}),
  })
);

const {
  createPaymentWebhookIndexHandler,
  parsePaymentWebhookEvent,
  parseStripePaymentWebhookEvent,
} = await import(
  '../../../../src/core/cloud/payment-webhook/payment-webhook-core.js'
);

/**
 * Build a Firestore-like wrapper dependency for payment webhook coverage.
 * @param {{ isMissingCustomer: () => boolean, set: Function }} options Fixture callbacks.
 * @returns {{ collection: Function }} Firestore-like database stub.
 */
function createPaymentWebhookDb({
  isMissingCustomer,
  set,
  getCustomerApiKeyUuid = () => 'uuid-1',
}) {
  return {
    collection: jest.fn(name => ({
      doc: jest.fn(eventId => ({
        get: jest.fn(async () => {
          if (name === 'payment-customers') {
            return {
              data: () => {
                if (isMissingCustomer()) {
                  return {};
                }
                if (eventId === 'cus-no-data') {
                  return undefined;
                }
                return { apiKeyUuid: getCustomerApiKeyUuid() };
              },
            };
          }
          return {
            exists: eventId !== 'evt-missing',
            data: () =>
              eventId === 'evt-no-event-data'
                ? undefined
                : eventId === 'evt-received'
                ? { status: 'received' }
                : eventId === 'evt-deferred'
                  ? { status: 'deferred' }
                  : {},
          };
        }),
        set,
      })),
    })),
  };
}

/**
 * Execute a wrapper response and assert its serialized result.
 * @param {object} options Response execution options.
 * @param {Function} options.mockDomainHandler Mocked domain handler.
 * @param {Function} options.handle Wrapper handle.
 * @param {object} options.request Request stub.
 * @param {object} options.body Domain response body.
 * @param {object} options.response Response stub.
 * @param {Function} options.assertion Response assertion.
 * @returns {Promise<void>} Completion promise.
 */
async function runWebhookResponse({
  mockDomainHandler,
  handle,
  request,
  body,
  response,
  assertion,
}) {
  mockDomainHandler.mockResolvedValueOnce(body);
  await handle(request, response);
  assertion(response);
}

/**
 * Build a response stub with chainable status handling.
 * @returns {object} Response stub.
 */
function createWebhookResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
}

describe('payment webhook cloud wrapper', () => {
  it('builds dependencies and forwards the structured response', async () => {
    const set = jest.fn(async () => undefined);
    let missingCustomer = false;
    let customerApiKeyUuid = 'uuid-1';
    const db = createPaymentWebhookDb({
      isMissingCustomer: () => missingCustomer,
      set,
      getCustomerApiKeyUuid: () => customerApiKeyUuid,
    });
    const billing = {
      markPurchasePaid: jest.fn(async input => ({ status: 201, body: input })),
      markPurchaseExpired: jest.fn(async input => ({
        status: 200,
        body: input,
      })),
      applyRefundEvent: jest.fn(async input => ({ status: 200, body: input })),
    };
    mockDb = db;
    mockBilling = billing;
    const response = {
      status: jest.fn(() => response),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
    };
    const Firestore = class {
      collection = db.collection;
    };
    const handle = createPaymentWebhookIndexHandler({
      firestore: Firestore,
      env: { STRIPE_WEBHOOK_SECRET: 'secret' },
      constructEvent: payload => JSON.parse(payload.toString()),
    });
    createPaymentWebhookIndexHandler({ firestore: Firestore });
    const defaultCaptured = mockCreatePaymentWebhookHandler.mock.calls[1][0];
    await expect(
      defaultCaptured.getPaymentEvent({ rawBody: '{}' })
    ).rejects.toThrow('Missing Stripe webhook secret');

    const request = {
      rawBody: JSON.stringify({ id: 'evt', type: 'payment_intent.succeeded' }),
      headers: { 'stripe-signature': 'signed' },
    };
    await expect(handle(request, response)).resolves.toBeUndefined();
    expect(mockDomainHandler).toHaveBeenCalledWith(request);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ request });

    const captured = mockCreatePaymentWebhookHandler.mock.calls[0][0];
    await captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-1' } },
    });
    missingCustomer = true;
    await captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-2' } },
    });
    missingCustomer = false;
    await captured.resolveApiKeyUuid({ data: { object: {} } });
    customerApiKeyUuid = '';
    await expect(
      captured.resolveApiKeyUuid({ data: { object: { customer: 'cus-empty' } } })
    ).resolves.toBeNull();
    customerApiKeyUuid = 42;
    await expect(
      captured.resolveApiKeyUuid({ data: { object: { customer: 'cus-number' } } })
    ).resolves.toBeNull();
    await expect(
      captured.resolveApiKeyUuid({ data: { object: { customer: 'cus-no-data' } } })
    ).resolves.toBeNull();
    customerApiKeyUuid = 'uuid-1';
    await expect(captured.isDuplicateEvent('evt-1')).resolves.toBe(true);
    await expect(captured.isDuplicateEvent('evt-received')).resolves.toBe(false);
    await expect(captured.isDuplicateEvent('evt-deferred')).resolves.toBe(false);
    await expect(captured.isDuplicateEvent('evt-no-event-data')).resolves.toBe(true);
    await expect(captured.isDuplicateEvent('evt-missing')).resolves.toBe(false);
    await Promise.all([
      captured.getPaymentEvent({
        rawBody: '{"id":"evt-verified"}',
        headers: { 'stripe-signature': 'signed' },
      }),
      captured.markProcessedEvent(
        { id: 'evt-1', type: 'payment_intent.succeeded', created: 10 },
        'uuid-1'
      ),
      captured.markProcessedEvent(
        { id: 'evt-2', type: 'payment_intent.succeeded' },
        'uuid-1'
      ),
    ]);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyUuid: 'uuid-1',
        type: 'payment_intent.succeeded',
        status: 'applied',
        createdAt: new Date(10000),
      }),
      { merge: true }
    );
    await Promise.all([
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-empty',
          type: 'customer.created',
          data: { object: {} },
        })
      ).resolves.toBeNull(),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-missing-purchase',
          type: 'checkout.session.completed',
          data: { object: { payment_status: 'paid' } },
        })
      ).resolves.toBeNull(),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-no-object',
          type: 'checkout.session.completed',
          data: { object: { metadata: { ['purchase_id']: 'p1' } } },
        })
      ).resolves.toBeNull(),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-no-data',
          type: 'customer.created',
        })
      ).resolves.toBeNull(),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-unpaid',
          type: 'checkout.session.completed',
          data: {
            object: {
              metadata: { ['purchase_id']: 'p1' },
              ['payment_status']: 'unpaid',
            },
          },
        })
      ).resolves.toBeNull(),
    ]);
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-1',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { ['purchase_id']: 'p1' },
            ['payment_status']: 'paid',
            ['payment_intent']: 'pi1',
          },
        },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        purchaseId: 'p1',
        eventId: 'evt-1',
        stripePaymentIntentId: 'pi1',
      },
    });
    await captured.handlePurchaseEvent({
      id: 'evt-no-intent',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { ['purchase_id']: 'p1' },
          ['payment_status']: 'paid',
        },
      },
    });
    await Promise.all([
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-2',
          type: 'payment_intent.succeeded',
          data: { object: { metadata: { ['purchase_id']: 'p1' } } },
        })
      ).resolves.toEqual({
        status: 201,
        body: {
          purchaseId: 'p1',
          eventId: 'evt-2',
          stripePaymentIntentId: 'evt-2',
        },
      }),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-expired',
          type: 'checkout.session.expired',
          data: { object: { metadata: { ['purchase_id']: 'p1' } } },
        })
      ).resolves.toEqual({
        status: 200,
        body: { purchaseId: 'p1', eventId: 'evt-expired' },
      }),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-3',
          type: 'charge.refunded',
          data: {
            object: {
              metadata: { ['purchase_id']: 'p1' },
              ['amount_refunded']: 4,
            },
          },
        })
      ).resolves.toEqual({
        status: 200,
        body: {
          purchaseId: 'p1',
          eventId: 'evt-3',
          refundedUsdMinor: 4,
          pricingSnapshotId: '',
        },
      }),
    ]);
    await captured.handlePurchaseEvent({
      id: 'evt-3b',
      type: 'charge.refunded',
      data: {
        object: {
          metadata: {
            ['purchase_id']: 'p1',
            ['pricing_snapshot_id']: 'snap-1',
          },
        },
      },
    });
    await Promise.all([
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-4',
          type: 'customer.created',
          data: { object: {} },
        })
      ).resolves.toBeNull(),
      expect(
        captured.handlePurchaseEvent({
          id: 'evt-5',
          type: 'customer.created',
          data: { object: { metadata: { ['purchase_id']: 'p1' } } },
        })
      ).resolves.toBeNull(),
    ]);
    const stringResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle,
      request,
      body: {
        status: 200,
        body: 'ok',
        headers: { 'x-test': 'yes', omitted: undefined },
      },
      response: stringResponse,
      assertion: response => expect(response.send).toHaveBeenCalledWith('ok'),
    });
    const creditResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle,
      request,
      body: { status: 200, body: { type: 'credit_added', applied: true } },
      response: creditResponse,
      assertion: response => expect(response.status).toHaveBeenCalledWith(201),
    });
    for (const body of [
      { type: 'other', applied: true },
      {},
    ]) {
      const unchangedResponse = createWebhookResponse();
      await runWebhookResponse({
        mockDomainHandler,
        handle,
        request,
        body: { status: 200, body },
        response: unchangedResponse,
        assertion: response => {
          expect(response.status).toHaveBeenCalledWith(200);
          expect(response.json).toHaveBeenCalledWith(body);
        },
      });
    }
    const jsonResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle,
      request,
      body: { status: 200, body: { type: 'credit_added', applied: false } },
      response: jsonResponse,
      assertion: response => {
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith({
          type: 'credit_added',
          applied: false,
        });
      },
    });
    const headerResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle,
      request,
      body: { status: 204, body: null, headers: { 'x-test': 'header' } },
      response: headerResponse,
      assertion: response => {
        expect(response.set).toHaveBeenCalledWith('x-test', 'header');
        expect(response.status).toHaveBeenCalledWith(204);
        expect(response.send).toHaveBeenCalledWith(null);
      },
    });
    for (const body of [null, '', 0]) {
      const falsyResponse = createWebhookResponse();
      await runWebhookResponse({
        mockDomainHandler,
        handle,
        request,
        body: { status: 202, body },
        response: falsyResponse,
        assertion: response => {
          expect(response.status).toHaveBeenCalledWith(202);
          expect(response.send).toHaveBeenCalledWith(body);
        },
      });
    }
  });
});

describe('payment webhook cloud wrapper validation', () => {
  it('requires Stripe secret, raw body, header, and injected verification', () => {
    const payload = JSON.stringify({
      id: 'signed',
      type: 'payment_intent.succeeded',
    });
    expect(() => parsePaymentWebhookEvent({ rawBody: payload })).toThrow(
      'Missing Stripe webhook secret'
    );
    expect(() => parsePaymentWebhookEvent({ rawBody: payload }, {})).toThrow(
      'Missing Stripe webhook secret'
    );
    expect(() =>
      parsePaymentWebhookEvent(
        { rawBody: payload, headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' }
      )
    ).toThrow('Stripe webhook verifier unavailable');
  });

  it('normalizes buffer payloads and rejects malformed verified events', () => {
    const payload = Buffer.from(JSON.stringify({ id: 'buffer-event' }));
    expect(
      parseStripePaymentWebhookEvent(
        { rawBody: payload, headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        received => JSON.parse(received.toString())
      ).id
    ).toBe('buffer-event');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}', headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => null
      )
    ).toThrow('Invalid Stripe webhook signature');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}', headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => ({ id: 42 })
      )
    ).toThrow('Invalid Stripe webhook signature');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}' },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => ({ id: 'unused' })
      )
    ).toThrow('Missing Stripe signature');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: '{}', headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => ({ id: '' })
      )
    ).toThrow('Invalid Stripe webhook signature');
    expect(() =>
      parseStripePaymentWebhookEvent(
        { rawBody: 42, headers: { 'stripe-signature': 'signed' } },
        { STRIPE_WEBHOOK_SECRET: 'secret' },
        () => ({ id: 'unused' })
      )
    ).toThrow('Missing Stripe webhook payload');
  });
});
