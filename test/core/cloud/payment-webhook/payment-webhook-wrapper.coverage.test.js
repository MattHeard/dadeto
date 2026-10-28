import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../../src/cloud/allow-effects.js';
import {
  sendPaymentWebhookResponse,
  logPaymentWebhookError,
} from '../../../../src/cloud/payment-webhook/response-effect-adapters.js';

const allowEffects = createAllowEffects();

let mockBilling;
const mockCreateBillingRuntime = jest.fn(() => mockBilling);
const mockCreatePaymentWebhookHandler = jest.fn();
const mockDomainHandler = jest.fn(async (_allowEffects, request) => ({
  status: 200,
  body: { request },
}));

await jest.unstable_mockModule(
  '../../../../src/core/cloud/billing/billing-runtime-core.js',
  () => ({
    createBillingRuntime: mockCreateBillingRuntime,
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
  it('requires an injected database instead of constructing one implicitly', () => {
    expect(() =>
      createPaymentWebhookIndexHandler(
        /** @type {any} */ ({ randomUUID: () => 'generated-id' })
      )
    ).toThrow('db must be provided');
  });

  it('requires an injected refund reconciliation writer', () => {
    expect(() =>
      createPaymentWebhookIndexHandler(
        /** @type {any} */ ({
          randomUUID: () => 'generated-id',
          db: {},
          writeRefundReconciliation: undefined,
        })
      )
    ).toThrow('writeRefundReconciliation must be provided');
  });

  it('requires an injected purchase transaction runner', () => {
    expect(() =>
      createPaymentWebhookIndexHandler(
        /** @type {any} */ ({
          randomUUID: () => 'generated-id',
          db: {},
          writeRefundReconciliation: jest.fn(),
          runBillingTransaction: undefined,
        })
      )
    ).toThrow('runBillingTransaction must be provided');
  });

  it('requires an injected deferred event reader', () => {
    expect(() =>
      createPaymentWebhookIndexHandler(
        /** @type {any} */ ({
          randomUUID: () => 'generated-id',
          db: {},
          writeRefundReconciliation: jest.fn(),
          runBillingTransaction: jest.fn(),
        })
      )
    ).toThrow('readDeferredPaymentEvents must be provided');
  });

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
    markPurchasePaid: jest.fn(async (_permission, input) => ({
      status: 201,
      body: input,
    })),
    markPurchaseExpired: jest.fn(async (_permission, input) => ({
      status: 200,
      body: input,
    })),
    applyRefundEvent: jest.fn(async input => ({ status: 200, body: input })),
    applyRefundIntentEvent: jest.fn(async (_permission, input) => ({
      status: 200,
      body:
        input.stripeStatus === 'pending' ||
        input.stripeStatus === 'requires_action'
          ? { deferred: true, refundIntentId: input.refundIntentId }
          : { applied: true, refundIntentId: input.refundIntentId },
    })),
    recordRefundReconciliation: jest.fn(async () => {}),
  };
  mockBilling = context.billing;
  context.response = {
    status: jest.fn(() => context.response),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
  context.randomUUID = jest.fn(() => 'webhook-generated-id');
  context.handle = createPaymentWebhookIndexHandler({
    randomUUID: context.randomUUID,
    db: context.db,
    writeRefundReconciliation: jest.fn(async () => {}),
    runBillingTransaction: jest.fn(async (_permission, update) => update({})),
    readDeferredPaymentEvents: jest.fn(async () => []),
    creditEventEffects: {},
    env: { STRIPE_WEBHOOK_SECRET: 'secret' },
    constructEvent: payload => JSON.parse(payload.toString()),
    markProcessedEvent: (permission, event, uuid, status) =>
      context.markProcessedEvent(permission, event, uuid, status),
    sendResponse: sendPaymentWebhookResponse,
    logError: logPaymentWebhookError,
  });
  expect(mockCreateBillingRuntime).toHaveBeenCalledWith(
    context.db,
    expect.objectContaining({ randomUUID: context.randomUUID })
  );
  expect(context.randomUUID).not.toHaveBeenCalled();
  context.markProcessedEvent = jest.fn();
  createPaymentWebhookIndexHandler({
    randomUUID: () => 'generated-id',
    db: context.db,
    writeRefundReconciliation: jest.fn(async () => {}),
    runBillingTransaction: jest.fn(async (_permission, update) => update({})),
    readDeferredPaymentEvents: jest.fn(async () => []),
    creditEventEffects: {},
    markProcessedEvent: jest.fn(),
    sendResponse: sendPaymentWebhookResponse,
    logError: logPaymentWebhookError,
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
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-unmatched-refund',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch-unmatched',
          ['payment_intent']: 'pi-unmatched',
          ['amount_refunded']: 70,
          metadata: {},
        },
      },
    })
  ).resolves.toMatchObject({
    body: {
      quarantined: true,
      reason: 'external_stripe_refund',
      eventId: 'evt-unmatched-refund',
    },
  });
  expect(context.billing.applyRefundEvent).not.toHaveBeenCalled();
  expect(context.billing.recordRefundReconciliation).toHaveBeenCalledWith(
    allowEffects,
    {
      eventId: 'evt-unmatched-refund',
      purchaseId: '',
      stripePaymentIntentId: 'pi-unmatched',
      chargeId: 'ch-unmatched',
      refundedUsdMinor: 70,
      reason: 'refund_details_missing',
    }
  );
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-no-metadata',
      type: 'charge.refunded',
    })
  ).resolves.toEqual({
    status: 200,
    body: {
      quarantined: true,
      reason: 'external_stripe_refund',
      eventId: 'evt-refund-no-metadata',
    },
  });
  expect(context.billing.applyRefundEvent).not.toHaveBeenCalled();
  expect(context.billing.recordRefundReconciliation).toHaveBeenLastCalledWith(
    allowEffects,
    {
      eventId: 'evt-refund-no-metadata',
      purchaseId: '',
      stripePaymentIntentId: '',
      chargeId: '',
      refundedUsdMinor: 0,
      reason: 'refund_details_missing',
    }
  );
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-pending',
      type: 'refund.created',
      data: {
        object: {
          id: 're-pending',
          ['payment_intent']: 'pi-1',
          charge: 'ch-1',
          amount: 100,
          currency: 'usd',
          status: 'pending',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toMatchObject({
    status: 200,
    body: { deferred: true, refundIntentId: 'intent-1' },
  });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenCalledWith(
    allowEffects,
    expect.objectContaining({ stripeStatus: 'pending' })
  );
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-succeeded',
      type: 'refund.updated',
      data: {
        object: {
          id: 're-succeeded',
          ['payment_intent']: 'pi-1',
          charge: 'ch-1',
          amount: 100,
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toMatchObject({
    status: 200,
    body: { applied: true, refundIntentId: 'intent-1' },
  });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenCalledWith(
    allowEffects,
    {
      refundIntentId: 'intent-1',
      purchaseId: 'p1',
      eventId: 'evt-refund-succeeded',
      stripeRefundId: 're-succeeded',
      stripePaymentIntentId: 'pi-1',
      amountUsdMinor: 100,
      currency: 'usd',
      stripeStatus: 'succeeded',
    }
  );
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-missing-metadata',
      type: 'refund.updated',
      data: {
        object: {
          id: {},
          ['payment_intent']: {},
          charge: {},
        },
      },
    })
  ).resolves.toMatchObject({
    status: 200,
    body: {
      quarantined: true,
      reason: 'refund_intent_metadata_missing',
    },
  });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenCalledTimes(2);
  await runMissingRefundShapeCases(context);
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-expanded-metadata-missing',
      type: 'refund.updated',
      data: {
        object: {
          id: { id: undefined },
          ['payment_intent']: { id: 'pi-expanded' },
          charge: { id: 'ch-expanded' },
        },
      },
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'refund_intent_metadata_missing' },
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-requires-action',
      type: 'refund.updated',
      data: {
        object: {
          id: 're-action',
          status: 'requires_action',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toMatchObject({ body: { deferred: true } });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenCalledTimes(3);

  context.billing.applyRefundIntentEvent
    .mockResolvedValueOnce({ status: 200, body: { quarantined: true } })
    .mockResolvedValueOnce({
      status: 200,
      body: { quarantined: true, reason: 'test_conflict' },
    })
    .mockResolvedValueOnce({ status: 200, body: 'legacy response' });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-conflict-default',
      type: 'refund.updated',
      data: {
        object: {
          id: 're-conflict-default',
          status: 'succeeded',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'refund_intent_conflict' },
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-conflict-specific',
      type: 'refund.updated',
      data: {
        object: {
          id: 're-conflict-specific',
          status: 'succeeded',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'test_conflict' },
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-legacy-response',
      type: 'refund.updated',
      data: {
        object: {
          id: 're-legacy',
          status: 'succeeded',
          metadata: {
            ['purchase_id']: 'p1',
            ['refund_intent_id']: 'intent-1',
          },
        },
      },
    })
  ).resolves.toEqual({ status: 200, body: 'legacy response' });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-charge-refunded',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch-1',
          ['payment_intent']: 'pi-1',
          ['amount_refunded']: 100,
          refunds: {
            data: [
              {
                id: 're-from-charge',
                amount: 100,
                currency: 'usd',
                status: 'succeeded',
                metadata: {
                  ['refund_intent_id']: 'intent-1',
                },
              },
            ],
          },
          metadata: { ['purchase_id']: 'p1' },
        },
      },
    })
  ).resolves.toMatchObject({
    status: 200,
    body: { applied: true, refundIntentId: 'intent-1' },
  });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenLastCalledWith(
    allowEffects,
    {
      refundIntentId: 'intent-1',
      purchaseId: 'p1',
      eventId: 'evt-charge-refunded:re-from-charge',
      stripeRefundId: 're-from-charge',
      stripePaymentIntentId: 'pi-1',
      amountUsdMinor: 100,
      currency: 'usd',
      stripeStatus: 'succeeded',
    }
  );
  context.billing.applyRefundIntentEvent.mockResolvedValueOnce({
    status: 200,
    body: { quarantined: true, reason: 'embedded_refund_conflict' },
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-charge-refunded-unmatched-item',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch-1',
          ['payment_intent']: 'pi-1',
          metadata: { ['purchase_id']: 'p1' },
          refunds: {
            data: [
              {
                amount: 100,
                currency: 'usd',
                status: 'succeeded',
                metadata: { ['refund_intent_id']: 'intent-1' },
              },
            ],
          },
        },
      },
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'embedded_refund_conflict' },
  });
  expect(context.billing.applyRefundIntentEvent).toHaveBeenLastCalledWith(
    allowEffects,
    {
      refundIntentId: 'intent-1',
      purchaseId: 'p1',
      eventId: 'evt-charge-refunded-unmatched-item:unknown',
      stripeRefundId: '',
      stripePaymentIntentId: 'pi-1',
      amountUsdMinor: 100,
      currency: 'usd',
      stripeStatus: 'succeeded',
    }
  );
}

/**
 * Cover missing Refund object and empty embedded refund shapes.
 * @param {Record<string, any>} context Captured handler context.
 * @returns {Promise<void>} Assertions are retained.
 */
async function runMissingRefundShapeCases(context) {
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-refund-object-missing',
      type: 'refund.updated',
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'refund_intent_metadata_missing' },
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-charge-refunded-empty-item',
      type: 'charge.refunded',
      data: { object: { refunds: { data: [{}] } } },
    })
  ).resolves.toMatchObject({
    body: { quarantined: true, reason: 'refund_intent_metadata_missing' },
  });
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
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-empty',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-missing-purchase',
        type: 'checkout.session.completed',
        data: { object: { ['payment_status']: 'paid' } },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-no-object',
        type: 'checkout.session.completed',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-no-data',
        type: 'customer.created',
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
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
    context.captured.handlePurchaseEvent(allowEffects, {
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
  expect(context.billing.markPurchasePaid).toHaveBeenCalledWith(allowEffects, {
    purchaseId: 'p1',
    eventId: 'evt-1',
    stripePaymentIntentId: 'pi1',
  });
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
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
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-2',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi2',
            metadata: { ['purchase_id']: 'p1' },
          },
        },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        purchaseId: 'p1',
        eventId: 'evt-2',
        stripePaymentIntentId: 'pi2',
      },
    }),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-2-no-intent-id',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        purchaseId: 'p1',
        eventId: 'evt-2-no-intent-id',
        stripePaymentIntentId: '',
      },
    }),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-expired',
        type: 'checkout.session.expired',
        data: { object: { metadata: { ['purchase_id']: 'p1' } } },
      })
    ).resolves.toEqual({
      status: 200,
      body: { purchaseId: 'p1', eventId: 'evt-expired' },
    }),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-3',
        type: 'charge.refunded',
        data: {
          object: {
            metadata: { ['purchase_id']: 'p1' },
            ['payment_intent']: 'pi1',
            ['id']: 'ch1',
            ['amount_refunded']: 4,
          },
        },
      })
    ).resolves.toEqual({
      status: 200,
      body: {
        quarantined: true,
        reason: 'external_stripe_refund',
        eventId: 'evt-3',
      },
    }),
  ]);
  expect(context.billing.markPurchaseExpired).toHaveBeenCalledWith(
    allowEffects,
    { purchaseId: 'p1', eventId: 'evt-expired' }
  );
  await expect(
    context.captured.handlePurchaseEvent(allowEffects, {
      id: 'evt-3b',
      type: 'charge.refunded',
      data: {
        object: {
          ['payment_intent']: 'pi1',
          ['id']: 'ch1',
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
      quarantined: true,
      reason: 'external_stripe_refund',
      eventId: 'evt-3b',
    },
  });
  await Promise.all([
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
        id: 'evt-4',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull(),
    expect(
      context.captured.handlePurchaseEvent(allowEffects, {
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
