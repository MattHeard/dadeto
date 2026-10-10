import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';

const allowEffects = createAllowEffects();

let mockDb;
let mockBilling;
const mockCreatePaymentWebhookHandler = jest.fn();
const mockDomainHandler = jest.fn(async (_allowEffects, request) => ({
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
  await handle(allowEffects, request, response);
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
    const context = {};
    await runScenario135Part0(context);
    await runScenario135Part1(context);
    await runScenario135Part2(context);
    await runScenario135Part3(context);
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

/**
 * Execute sequential fixture scenario 1.
 * @param {Record<string, any>} context Shared fixture state.
 * @returns {Promise<void>} Assertions and fixture mutations are retained.
 */
async function runScenario135Part0(context) {
  context.set = jest.fn(async () => undefined);
  context.missingCustomer = false;
  context.customerApiKeyUuid = 'uuid-1';
  context.db = createPaymentWebhookDb({
    isMissingCustomer: () => context.missingCustomer,
    set: context.set,
    getCustomerApiKeyUuid: () => context.customerApiKeyUuid,
  });
  context.billing = {
    markPurchasePaid: jest.fn(async input => ({ status: 201, body: input })),
    markPurchaseExpired: jest.fn(async input => ({
      status: 200,
      body: input,
    })),
    applyRefundEvent: jest.fn(async input => ({ status: 200, body: input })),
  };
  mockDb = context.db;
  mockBilling = context.billing;
  context.response = {
    status: jest.fn(() => context.response),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
  context.Firestore = class {
    collection = context.db.collection;
  };
  context.handle = createPaymentWebhookIndexHandler({
    firestore: context.Firestore,
    env: { STRIPE_WEBHOOK_SECRET: 'secret' },
    constructEvent: payload => JSON.parse(payload.toString()),
    markProcessedEvent: (permission, event, uuid, status) =>
      context.markProcessedEvent(permission, event, uuid, status),
  });
  context.markProcessedEvent = jest.fn();
  createPaymentWebhookIndexHandler({
    firestore: context.Firestore,
    markProcessedEvent: jest.fn(),
  });
  context.defaultCaptured = mockCreatePaymentWebhookHandler.mock.calls[1][0];
  await expect(
    context.defaultCaptured.getPaymentEvent({ rawBody: '{}' })
  ).rejects.toThrow('Missing Stripe webhook secret');
  context.request = {
    rawBody: JSON.stringify({ id: 'evt', type: 'payment_intent.succeeded' }),
    headers: { 'stripe-signature': 'signed' },
  };
  await expect(
    context.handle(allowEffects, context.request, context.response)
  ).resolves.toBeUndefined();
  expect(mockDomainHandler).toHaveBeenCalledWith(allowEffects, context.request);
  expect(context.response.status).toHaveBeenCalledWith(200);
  expect(context.response.json).toHaveBeenCalledWith({
    request: context.request,
  });
  context.requestError = new Error('request failed');
  mockDomainHandler.mockRejectedValueOnce(context.requestError);
}

/**
 * Execute sequential fixture scenario 2.
 * @param {Record<string, any>} context Shared fixture state.
 * @returns {Promise<void>} Assertions and fixture mutations are retained.
 */
async function runScenario135Part1(context) {
  await expect(
    context.handle(allowEffects, context.request, context.response)
  ).rejects.toBe(context.requestError);
  context.captured = mockCreatePaymentWebhookHandler.mock.calls[0][0];
  await expect(
    context.captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-1' } },
    })
  ).resolves.toBe('uuid-1');
  context.missingCustomer = true;
  await context.captured.resolveApiKeyUuid({
    data: { object: { customer: 'cus-2' } },
  });
  context.missingCustomer = false;
  await context.captured.resolveApiKeyUuid({ data: { object: {} } });
  context.customerApiKeyUuid = '';
  await expect(
    context.captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-empty' } },
    })
  ).resolves.toBeNull();
  context.customerApiKeyUuid = 42;
  await expect(
    context.captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-number' } },
    })
  ).resolves.toBeNull();
  await expect(
    context.captured.resolveApiKeyUuid({
      data: { object: { customer: 'cus-no-data' } },
    })
  ).resolves.toBeNull();
  context.customerApiKeyUuid = 'uuid-1';
  await expect(context.captured.isDuplicateEvent('evt-1')).resolves.toBe(true);
  await expect(context.captured.isDuplicateEvent('evt-received')).resolves.toBe(
    false
  );
  await expect(context.captured.isDuplicateEvent('evt-deferred')).resolves.toBe(
    false
  );
  await expect(
    context.captured.isDuplicateEvent('evt-no-event-data')
  ).resolves.toBe(true);
  await expect(context.captured.isDuplicateEvent('evt-missing')).resolves.toBe(
    false
  );
  await Promise.all([
    context.captured.getPaymentEvent({
      rawBody: '{"id":"evt-verified"}',
      headers: { 'stripe-signature': 'signed' },
    }),
    context.captured.markProcessedEvent(
      allowEffects,
      { id: 'evt-1', type: 'payment_intent.succeeded', created: 10 },
      'uuid-1'
    ),
    context.captured.markProcessedEvent(
      allowEffects,
      { id: 'evt-2', type: 'payment_intent.succeeded' },
      'uuid-1'
    ),
  ]);
}

/**
 * Execute sequential fixture scenario 3.
 * @param {Record<string, any>} context Shared fixture state.
 * @returns {Promise<void>} Assertions and fixture mutations are retained.
 */
async function runScenario135Part2(context) {
  expect(context.db.collection).toHaveBeenCalledWith('payment-customers');
  expect(context.markProcessedEvent).toHaveBeenNthCalledWith(
    1,
    allowEffects,
    { id: 'evt-1', type: 'payment_intent.succeeded', created: 10 },
    'uuid-1',
    undefined
  );
  expect(context.markProcessedEvent).toHaveBeenNthCalledWith(
    2,
    allowEffects,
    { id: 'evt-2', type: 'payment_intent.succeeded' },
    'uuid-1',
    undefined
  );
  await Promise.all([
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-empty',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-missing-purchase',
        type: 'checkout.session.completed',
        data: { object: { ['payment_status']: 'paid' } },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-no-object',
        type: 'checkout.session.completed',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-no-data',
        type: 'customer.created',
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent({
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
    context.captured.handlePurchaseEvent({
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
  await expect(
    context.captured.handlePurchaseEvent({
      id: 'evt-no-intent',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { ['purchase_id']: 'p1' },
          ['payment_status']: 'paid',
        },
      },
    })
  ).resolves.toEqual({
    status: 201,
    body: {
      purchaseId: 'p1',
      eventId: 'evt-no-intent',
      stripePaymentIntentId: '',
    },
  });
  await Promise.all([
    expect(
      context.captured.handlePurchaseEvent({
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
      context.captured.handlePurchaseEvent({
        id: 'evt-expired',
        type: 'checkout.session.expired',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toEqual({
      status: 200,
      body: { purchaseId: 'p1', eventId: 'evt-expired' },
    }),
    expect(
      context.captured.handlePurchaseEvent({
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
  await expect(
    context.captured.handlePurchaseEvent({
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
    })
  ).resolves.toEqual({
    status: 200,
    body: {
      purchaseId: 'p1',
      eventId: 'evt-3b',
      refundedUsdMinor: 0,
      pricingSnapshotId: 'snap-1',
    },
  });
  await Promise.all([
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-4',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent({
        id: 'evt-5',
        type: 'customer.created',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toBeNull(),
  ]);
  context.stringResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: {
      status: 200,
      body: 'ok',
      headers: { 'x-test': 'yes', omitted: undefined },
    },
    response: context.stringResponse,
    assertion: response => expect(response.send).toHaveBeenCalledWith('ok'),
  });
  context.creditResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 200, body: { type: 'credit_added', applied: true } },
    response: context.creditResponse,
    assertion: response => expect(response.status).toHaveBeenCalledWith(201),
  });
  context.nonSuccessCreditResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 500, body: { type: 'credit_added', applied: true } },
    response: context.nonSuccessCreditResponse,
    assertion: response => {
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        type: 'credit_added',
        applied: true,
      });
    },
  });
  for (const body of [{ type: 'other', applied: true }, {}]) {
    const unchangedResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle: context.handle,
      request: context.request,
      body: { status: 200, body },
      response: unchangedResponse,
      assertion: response => {
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(body);
      },
    });
  }
  context.jsonResponse = createWebhookResponse();
}

/**
 * Execute sequential fixture scenario 4.
 * @param {Record<string, any>} context Shared fixture state.
 * @returns {Promise<void>} Assertions and fixture mutations are retained.
 */
async function runScenario135Part3(context) {
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 200, body: { type: 'credit_added', applied: false } },
    response: context.jsonResponse,
    assertion: response => {
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({
        type: 'credit_added',
        applied: false,
      });
    },
  });
  context.headerResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 204, body: null, headers: { 'x-test': 'header' } },
    response: context.headerResponse,
    assertion: response => {
      expect(response.set).toHaveBeenCalledWith('x-test', 'header');
      expect(response.status).toHaveBeenCalledWith(204);
      expect(response.send).toHaveBeenCalledWith(null);
    },
  });
  context.responseWithoutSet = createWebhookResponse();
  delete context.responseWithoutSet.set;
  await expect(
    runWebhookResponse({
      mockDomainHandler,
      handle: context.handle,
      request: context.request,
      body: { status: 200, body: 'ok', headers: { 'x-test': 'yes' } },
      response: context.responseWithoutSet,
      assertion: response => expect(response.send).toHaveBeenCalledWith('ok'),
    })
  ).resolves.toBeUndefined();
  for (const body of [null, '', 0]) {
    const falsyResponse = createWebhookResponse();
    await runWebhookResponse({
      mockDomainHandler,
      handle: context.handle,
      request: context.request,
      body: { status: 202, body },
      response: falsyResponse,
      assertion: response => {
        expect(response.status).toHaveBeenCalledWith(202);
        expect(response.send).toHaveBeenCalledWith(body);
      },
    });
  }
  context.truthyPrimitiveResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 202, body: 7 },
    response: context.truthyPrimitiveResponse,
    assertion: response => expect(response.send).toHaveBeenCalledWith(7),
  });
  context.successfulPrimitiveResponse = createWebhookResponse();
  await runWebhookResponse({
    mockDomainHandler,
    handle: context.handle,
    request: context.request,
    body: { status: 200, body: 7 },
    response: context.successfulPrimitiveResponse,
    assertion: response => {
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.send).toHaveBeenCalledWith(7);
    },
  });
}
