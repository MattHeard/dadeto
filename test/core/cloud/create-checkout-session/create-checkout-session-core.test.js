import { describe, expect, it, jest } from '@jest/globals';
import {
  createCheckoutSessionExpressHandle,
  createCheckoutSessionHandler,
} from '../../../../src/core/cloud/create-checkout-session/create-checkout-session-core.js';
import { createPricingSnapshot } from '../../../../src/core/cloud/billing/pricing-core.js';

const request = (
  body = { packageId: 'credits-100' },
  key = '7af49d79-1943-4724-b57e-48310bca15d0'
) => ({
  method: 'POST',
  headers: { authorization: 'Bearer token', 'idempotency-key': key },
  body,
});

/**
 *
 * @param overrides
 */
/**
 * Build handler dependencies for a checkout-session test.
 * @param {Record<string, unknown>} [overrides] Dependency overrides.
 * @returns {{ create: jest.Mock, handler: (request?: object) => Promise<object> }} Test fixtures.
 */
function setup(overrides = {}) {
  const create = jest.fn().mockResolvedValue({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/x',
    expires_at: 1785869100,
  });
  const dependencies = {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid-1' }),
    resolveApiKeyUuidForUid: jest
      .fn()
      .mockResolvedValue({ apiKeyUuid: 'key-1' }),
    resolveBillingCustomer: jest
      .fn()
      .mockResolvedValue({ stripeCustomerId: 'cus-1' }),
    createBillingCustomer: jest.fn(),
    saveCustomerMappings: jest.fn(),
    getCreditPackage: jest
      .fn()
      .mockImplementation(packageId =>
        Promise.resolve(
          packageId === 'credits-100'
            ? { stripePriceId: 'price-100', credits: 100, active: true }
            : null
        )
      ),
    createStripeCheckoutSession: create,
    publicBillingOrigin: 'https://example.com',
    now: () => new Date('2026-08-04T00:00:00Z'),
    ...overrides,
  };
  return {
    create,
    dependencies,
    handler: createCheckoutSessionHandler(dependencies),
  };
}

describe('createCheckoutSessionHandler', () => {
  it('creates a server-priced session for the owned key', async () => {
    const saveIdempotency = jest.fn();
    const { handler, create } = setup({ saveIdempotency });
    await expect(handler(request())).resolves.toMatchObject({
      status: 201,
      body: { checkoutSessionId: 'cs_test_1' },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: 'key-1',
        line_items: [{ price: 'price-100', quantity: 1 }],
        success_url:
          'https://example.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
      }),
      {
        idempotencyKey:
          'checkout-session:uid-1:7af49d79-1943-4724-b57e-48310bca15d0',
      }
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty('amount');
    expect(saveIdempotency).toHaveBeenCalledWith(
      'uid-1',
      '7af49d79-1943-4724-b57e-48310bca15d0',
      expect.objectContaining({ packageId: 'credits-100' })
    );
  });
  it('creates dynamic USD price data from the current pricing snapshot', async () => {
    const pricingSnapshot = createPricingSnapshot({
      snapshotId: 'daily-1',
      effectiveAt: '2026-08-05T00:00:00.000Z',
      eurPerUsdMicros: 900_000,
      creditEurMicros: 1,
      markupBps: 0,
      operations: [{ id: 'function.invoke', costEurMicros: 1 }],
    });
    const dynamic = setup({
      getCreditPackage: jest.fn().mockResolvedValue({
        active: true,
        amountUsdMinor: 1_000,
        pricingSnapshot,
      }),
    });
    await expect(dynamic.handler(request())).resolves.toMatchObject({
      status: 201,
    });
    expect(dynamic.create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'usd',
              unit_amount: 1_000,
            }),
          }),
        ],
        metadata: expect.objectContaining({
          pricing_snapshot_id: 'daily-1',
        }),
      })
    );
  });

  it('rejects a dynamic package that would issue zero credits', async () => {
    const zeroCreditSnapshot = createPricingSnapshot({
      snapshotId: 'zero-credit',
      effectiveAt: '2026-08-05T00:00:00.000Z',
      eurPerUsdMicros: 1,
      creditEurMicros: 2,
      markupBps: 0,
      operations: [{ id: 'function.invoke', costEurMicros: 1 }],
    });
    const { handler } = setup({
      getCreditPackage: jest.fn().mockResolvedValue({
        active: true,
        amountUsdMinor: 1,
        pricingSnapshot: zeroCreditSnapshot,
      }),
    });

    await expect(handler(request())).resolves.toMatchObject({ status: 400 });
  });
  it('persists a purchase before attaching it to Checkout metadata', async () => {
    const createPurchase = jest.fn().mockResolvedValue({
      purchaseId: 'purchase-1',
    });
    const savePurchaseCheckout = jest.fn();
    const dynamic = setup({
      createPurchase,
      savePurchaseCheckout,
      getCreditPackage: jest.fn().mockResolvedValue({
        active: true,
        amountUsdMinor: 1_000,
        pricingSnapshot: createPricingSnapshot({
          snapshotId: 'daily-1',
          effectiveAt: '2026-08-05T00:00:00.000Z',
          eurPerUsdMicros: 900_000,
          creditEurMicros: 1,
          markupBps: 0,
          operations: [{ id: 'function.invoke', costEurMicros: 1 }],
        }),
      }),
    });
    await dynamic.handler(request());
    expect(createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaseId: expect.stringContaining('purchase-uid-1-'),
        creditsIssued: 9_000_000,
      })
    );
    expect(dynamic.create.mock.calls[0][0].metadata).toEqual(
      expect.objectContaining({ purchase_id: 'purchase-1' })
    );
    expect(savePurchaseCheckout).toHaveBeenCalledWith(
      'purchase-1',
      expect.objectContaining({ checkoutSessionId: 'cs_test_1' })
    );
  });
  it.each([
    [{}, 401, 'authentication_required'],
    [
      { headers: { authorization: 'Bearer token' } },
      400,
      'invalid_idempotency_key',
    ],
    [request({ packageId: 'missing' }), 400, 'invalid_package'],
  ])('rejects invalid input', async (input, status, code) => {
    const { handler } = setup();
    await expect(handler(input)).resolves.toMatchObject({
      status,
      body: { error: { code } },
    });
  });
  it('does not create a session without an eligible key', async () => {
    const { handler, create } = setup({
      resolveApiKeyUuidForUid: jest.fn().mockResolvedValue(null),
    });
    await expect(handler(request())).resolves.toMatchObject({ status: 403 });
    expect(create).not.toHaveBeenCalled();
  });
  it('returns an existing idempotent result and detects conflicts', async () => {
    const existing = {
      checkoutSessionId: 'cs_old',
      url: 'https://checkout.stripe.com/old',
      expiresAt: new Date().toISOString(),
    };
    const first = setup({
      resolveIdempotency: jest.fn().mockResolvedValue({ session: existing }),
    });
    await expect(first.handler(request())).resolves.toEqual({
      status: 201,
      body: existing,
    });
    const conflict = setup({
      resolveIdempotency: jest.fn().mockResolvedValue({ conflict: true }),
    });
    await expect(conflict.handler(request())).resolves.toMatchObject({
      status: 409,
    });
  });

  it.each([
    [{ method: 'GET', headers: request().headers, body: request().body }, 405],
    [
      {
        ...request(),
        headers: { ...request().headers, authorization: 'token' },
      },
      401,
    ],
    [{ ...request(), body: null }, 400],
    [{ ...request(), body: { packageId: 'x', extra: true } }, 400],
  ])('rejects additional invalid request shape', async (input, status) => {
    const { handler } = setup();
    await expect(handler(input)).resolves.toMatchObject({ status });
  });

  it('rejects a verifier failure and a token without a uid', async () => {
    const rejected = setup({
      verifyIdToken: jest.fn().mockRejectedValue(new Error()),
    });
    await expect(rejected.handler(request())).resolves.toMatchObject({
      status: 401,
    });
    const missingUid = setup({
      verifyIdToken: jest.fn().mockResolvedValue({}),
    });
    await expect(missingUid.handler(request())).resolves.toMatchObject({
      status: 401,
    });
  });

  it('maps provider failures and billing configuration failures', async () => {
    const authFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ type: 'StripeAuthenticationError' }),
    });
    await expect(authFailure.handler(request())).resolves.toMatchObject({
      status: 502,
    });
    const rateFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ type: 'StripeRateLimitError' }),
    });
    await expect(rateFailure.handler(request())).resolves.toMatchObject({
      status: 429,
    });
    const keyFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ code: 'idempotency_key_in_use' }),
    });
    await expect(keyFailure.handler(request())).resolves.toMatchObject({
      status: 409,
    });
    const config = setup({ publicBillingOrigin: '' });
    await expect(config.handler(request())).resolves.toMatchObject({
      status: 500,
    });
  });

  it('creates a customer and rejects an incomplete customer', async () => {
    const created = setup({
      resolveBillingCustomer: jest.fn().mockResolvedValue(null),
      createBillingCustomer: jest
        .fn()
        .mockResolvedValue({ stripeCustomerId: 'cus-new' }),
    });
    await expect(created.handler(request())).resolves.toMatchObject({
      status: 201,
    });
    const incomplete = setup({
      resolveBillingCustomer: jest.fn().mockResolvedValue(null),
      createBillingCustomer: jest.fn().mockResolvedValue({}),
    });
    await expect(incomplete.handler(request())).resolves.toMatchObject({
      status: 502,
    });
  });

  it('supports omitted requests and the Express method guard', async () => {
    const { handler, dependencies } = setup();
    await expect(handler()).resolves.toMatchObject({ status: 401 });
    const response = {
      set: jest.fn(),
      status: jest.fn().mockReturnValue({ json: jest.fn() }),
    };
    await createCheckoutSessionExpressHandle(dependencies)(
      { method: 'GET' },
      response
    );
    expect(response.set).toHaveBeenCalledWith('Allow', 'POST');
    await createCheckoutSessionExpressHandle(dependencies)(request(), response);
  });
});
