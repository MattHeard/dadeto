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

const { createPaymentWebhookIndexHandler, parsePaymentWebhookEvent } =
  await import(
    '../../../../src/core/cloud/payment-webhook/payment-webhook-core.js'
  );

describe('payment webhook cloud wrapper', () => {
  it('builds dependencies and forwards the structured response', async () => {
    const set = jest.fn(async () => undefined);
    let missingCustomer = false;
    const db = {
      collection: jest.fn(name => ({
        doc: jest.fn(() => ({
          get: jest.fn(async () =>
            name === 'payment-customers'
              ? {
                  data: () => (missingCustomer ? {} : { apiKeyUuid: 'uuid-1' }),
                }
              : { exists: true, data: () => ({}) }
          ),
          set,
        })),
      })),
    };
    const billing = {
      markPurchasePaid: jest.fn(async input => ({ status: 201, body: input })),
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
    await expect(captured.isDuplicateEvent('evt-1')).resolves.toBe(true);
    await captured.getPaymentEvent({
      rawBody: '{"id":"evt-verified"}',
      headers: { 'stripe-signature': 'signed' },
    });
    await captured.markProcessedEvent(
      { id: 'evt-1', type: 'payment_intent.succeeded', created: 10 },
      'uuid-1'
    );
    await captured.markProcessedEvent(
      { id: 'evt-2', type: 'payment_intent.succeeded' },
      'uuid-1'
    );
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-empty',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull();
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-no-data',
        type: 'customer.created',
      })
    ).resolves.toBeNull();
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-unpaid',
        type: 'checkout.session.completed',
        data: {
          object: { metadata: { purchase_id: 'p1' }, payment_status: 'unpaid' },
        },
      })
    ).resolves.toBeNull();
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-1',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { purchase_id: 'p1' },
            payment_status: 'paid',
            payment_intent: 'pi1',
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
        object: { metadata: { purchase_id: 'p1' }, payment_status: 'paid' },
      },
    });
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-2',
        type: 'payment_intent.succeeded',
        data: { object: { metadata: { purchase_id: 'p1' } } },
      })
    ).resolves.toEqual({
      status: 201,
      body: {
        purchaseId: 'p1',
        eventId: 'evt-2',
        stripePaymentIntentId: 'evt-2',
      },
    });
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-3',
        type: 'charge.refunded',
        data: {
          object: { metadata: { purchase_id: 'p1' }, amount_refunded: 4 },
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
    });
    await captured.handlePurchaseEvent({
      id: 'evt-3b',
      type: 'charge.refunded',
      data: {
        object: {
          metadata: { purchase_id: 'p1', pricing_snapshot_id: 'snap-1' },
        },
      },
    });
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-4',
        type: 'customer.created',
        data: { object: {} },
      })
    ).resolves.toBeNull();
    await expect(
      captured.handlePurchaseEvent({
        id: 'evt-5',
        type: 'customer.created',
        data: { object: { metadata: { purchase_id: 'p1' } } },
      })
    ).resolves.toBeNull();
    mockDomainHandler.mockResolvedValueOnce({
      status: 200,
      body: 'ok',
      headers: { 'x-test': 'yes', omitted: undefined },
    });
    const stringResponse = {
      status: jest.fn(() => stringResponse),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
    };
    await handle(request, stringResponse);
    expect(stringResponse.send).toHaveBeenCalledWith('ok');
    mockDomainHandler.mockResolvedValueOnce({
      status: 200,
      body: { type: 'credit_added', applied: true },
    });
    const creditResponse = {
      status: jest.fn(() => creditResponse),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
    };
    await handle(request, creditResponse);
    expect(creditResponse.status).toHaveBeenCalledWith(201);
  });

  it('requires Stripe secret, raw body, header, and injected verification', () => {
    const payload = JSON.stringify({
      id: 'signed',
      type: 'payment_intent.succeeded',
    });
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
});
