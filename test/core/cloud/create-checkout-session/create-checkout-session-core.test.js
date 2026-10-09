import { describe, expect, it, jest } from '@jest/globals';
import {
  createCheckoutSessionTestUtils,
  createCheckoutSessionExpressHandle,
  createCheckoutSessionHandler,
} from '../../../../src/core/cloud/create-checkout-session/create-checkout-session-core.js';
import { createPricingSnapshot } from '../../../../src/core/cloud/billing/pricing-core.js';

const stripeField = {
  expiresAt: 'expires_at',
  clientReferenceId: 'client_reference_id',
  lineItems: 'line_items',
  successUrl: 'success_url',
  priceData: 'price_data',
  unitAmount: 'unit_amount',
  pricingSnapshotId: 'pricing_snapshot_id',
  purchaseId: 'purchase_id',
};
const allowEffects =
  /** @type {import('../../../../types/allow-effects').AllowEffects} */ ({});

it('reports a missing public billing origin before checkout dependencies run', async () => {
  await expect(
    createCheckoutSessionTestUtils.createCheckoutResult(allowEffects, {
      deps: {},
      request: {
        key: 'k',
        packageId: 'p',
        uid: 'u',
        creditPackage: { credits: 1 },
      },
      apiKeyUuid: 'uuid',
    })
  ).resolves.toMatchObject({
    status: 500,
    body: { error: { code: 'configuration_error' } },
  });
});

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
    [stripeField.expiresAt]: 1785869100,
  });
  const dependencies = {
    billingEnabled: true,
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid-1' }),
    resolveApiKeyUuidForUid: jest
      .fn()
      .mockResolvedValue({ apiKeyUuid: 'key-1' }),
    resolveBillingCustomer: jest
      .fn()
      .mockResolvedValue({ stripeCustomerId: 'cus-1' }),
    createBillingCustomer: jest.fn(),
    saveCustomerMappings: jest.fn(),
    getCreditPackage: jest.fn().mockImplementation(packageId => {
      if (packageId === 'credits-100') {
        return Promise.resolve({
          stripePriceId: 'price-100',
          credits: 100,
          active: true,
        });
      }
      return Promise.resolve(null);
    }),
    createStripeCheckoutSession: create,
    publicBillingOrigin: 'https://example.com',
    now: () => new Date('2026-08-04T00:00:00Z'),
    ...overrides,
  };
  return {
    create,
    dependencies,
    handler: (() => {
      const handle = createCheckoutSessionHandler(dependencies);
      return input => handle(allowEffects, input);
    })(),
  };
}

describe('createCheckoutSessionHandler', () => {
  it('forwards the request capability to every checkout command dependency', async () => {
    const saveCustomerMappings = jest.fn();
    const createBillingCustomer = jest
      .fn()
      .mockResolvedValue({ stripeCustomerId: 'cus-new' });
    const createPurchase = jest
      .fn()
      .mockResolvedValue({ purchaseId: 'purchase-1' });
    const savePurchaseCheckout = jest.fn();
    const saveIdempotency = jest.fn();
    const { handler, create } = setup({
      resolveBillingCustomer: jest.fn().mockResolvedValue(null),
      createBillingCustomer,
      saveCustomerMappings,
      createPurchase,
      savePurchaseCheckout,
      saveIdempotency,
    });

    await expect(handler(request())).resolves.toMatchObject({ status: 201 });

    expect(createBillingCustomer).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ idempotencyKey: 'billing-customer:uid-1' })
    );
    expect(saveCustomerMappings).toHaveBeenCalledWith(
      allowEffects,
      'uid-1',
      'cus-new',
      'key-1'
    );
    expect(createPurchase).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({ purchaseId: expect.any(String) })
    );
    expect(create).toHaveBeenCalledWith(
      allowEffects,
      expect.any(Object),
      expect.any(Object)
    );
    expect(savePurchaseCheckout).toHaveBeenCalledWith(
      allowEffects,
      'purchase-1',
      expect.objectContaining({ checkoutSessionId: 'cs_test_1' })
    );
    expect(saveIdempotency).toHaveBeenCalledWith(
      allowEffects,
      'uid-1',
      '7af49d79-1943-4724-b57e-48310bca15d0',
      expect.objectContaining({ packageId: 'credits-100' })
    );
  });

  it('rejects checkout before authentication or side effects when billing is disabled', async () => {
    const { handler, create, dependencies } = setup({ billingEnabled: false });

    await expect(handler(request())).resolves.toEqual({
      status: 503,
      body: {
        error: {
          code: 'billing_disabled',
          message: 'Billing is not currently available.',
        },
      },
    });
    expect(dependencies.verifyIdToken).not.toHaveBeenCalled();
    expect(dependencies.getCreditPackage).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('defaults checkout to disabled when the flag is absent', async () => {
    const { handler } = setup({ billingEnabled: undefined });

    await expect(handler(request())).resolves.toMatchObject({
      status: 503,
      body: { error: { code: 'billing_disabled' } },
    });
  });

  it('returns a runtime error when Stripe is not configured', async () => {
    const { handler, create } = setup({ stripeConfigured: false });

    await expect(handler(request())).resolves.toEqual({
      status: 503,
      body: {
        error: {
          code: 'payment_provider_unavailable',
          message: 'Checkout is temporarily unavailable.',
        },
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a server-priced session for the owned key', async () => {
    const saveIdempotency = jest.fn();
    const { handler, create } = setup({ saveIdempotency });
    await expect(handler(request())).resolves.toMatchObject({
      status: 201,
      body: { checkoutSessionId: 'cs_test_1' },
    });
    expect(create).toHaveBeenCalledWith(
      allowEffects,
      expect.objectContaining({
        [stripeField.clientReferenceId]: 'key-1',
        [stripeField.lineItems]: [{ price: 'price-100', quantity: 1 }],
        [stripeField.successUrl]:
          'https://example.com/billing/success?session_id={CHECKOUT_SESSION_ID}',
      }),
      {
        idempotencyKey:
          'checkout-session:uid-1:7af49d79-1943-4724-b57e-48310bca15d0',
      }
    );
    expect(create.mock.calls[0][1]).not.toHaveProperty('amount');
    expect(saveIdempotency).toHaveBeenCalledWith(
      allowEffects,
      'uid-1',
      '7af49d79-1943-4724-b57e-48310bca15d0',
      expect.objectContaining({ packageId: 'credits-100' })
    );
  });
});

describe('createCheckoutSessionHandler pricing paths', () => {
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
    expect(dynamic.create.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        [stripeField.lineItems]: [
          expect.objectContaining({
            [stripeField.priceData]: expect.objectContaining({
              currency: 'usd',
              [stripeField.unitAmount]: 1_000,
            }),
          }),
        ],
        metadata: expect.objectContaining({
          [stripeField.pricingSnapshotId]: 'daily-1',
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
      allowEffects,
      expect.objectContaining({
        purchaseId: expect.stringContaining('purchase-uid-1-'),
        creditsIssued: 9_000_000,
      })
    );
    expect(dynamic.create.mock.calls[0][1].metadata).toEqual(
      expect.objectContaining({ [stripeField.purchaseId]: 'purchase-1' })
    );
    expect(savePurchaseCheckout).toHaveBeenCalledWith(
      allowEffects,
      'purchase-1',
      expect.objectContaining({ checkoutSessionId: 'cs_test_1' })
    );
  });
  it.each([
    [{}, 401, 'authentication_required', 'Authentication is required.'],
    [
      { headers: { authorization: 'Bearer token' } },
      400,
      'invalid_idempotency_key',
      'A valid idempotency key is required.',
    ],
    [
      request({ packageId: 'missing' }),
      400,
      'invalid_package',
      'The selected credit package is unavailable.',
    ],
  ])('rejects invalid input', async (input, status, code, message) => {
    const { handler } = setup();
    await expect(handler(input)).resolves.toEqual({
      status,
      body: { error: { code, message } },
    });
  });
});

describe('createCheckoutSessionHandler validation paths', () => {
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
    await expect(rejected.handler(request())).resolves.toEqual({
      status: 401,
      body: {
        error: {
          code: 'invalid_token',
          message: 'The authentication token is invalid or expired.',
        },
      },
    });
    const missingUid = setup({
      verifyIdToken: jest.fn().mockResolvedValue({}),
    });
    await expect(missingUid.handler(request())).resolves.toEqual({
      status: 401,
      body: {
        error: {
          code: 'invalid_token',
          message: 'The authentication token is invalid.',
        },
      },
    });
  });

  it('maps provider failures and billing configuration failures', async () => {
    const authFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ type: 'StripeAuthenticationError' }),
    });
    await expect(authFailure.handler(request())).resolves.toEqual({
      status: 502,
      body: {
        error: {
          code: 'payment_provider_unavailable',
          message: 'The payment provider is unavailable.',
        },
      },
    });
    const rateFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ type: 'StripeRateLimitError' }),
    });
    await expect(rateFailure.handler(request())).resolves.toEqual({
      status: 429,
      body: {
        error: { code: 'rate_limited', message: 'Too many purchase attempts.' },
      },
    });
    const keyFailure = setup({
      createStripeCheckoutSession: jest
        .fn()
        .mockRejectedValue({ code: 'idempotency_key_in_use' }),
    });
    await expect(keyFailure.handler(request())).resolves.toEqual({
      status: 409,
      body: {
        error: {
          code: 'idempotency_conflict',
          message:
            'This purchase attempt was already used with different parameters.',
        },
      },
    });
    const config = setup({ publicBillingOrigin: '' });
    await expect(config.handler(request())).resolves.toEqual({
      status: 500,
      body: {
        error: {
          code: 'configuration_error',
          message: 'Billing is not configured.',
        },
      },
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
      respond: jest.fn(),
    };
    await createCheckoutSessionExpressHandle(dependencies)(
      allowEffects,
      { method: 'GET' },
      response
    );
    expect(response.set).toHaveBeenCalledWith(allowEffects, 'Allow', 'POST');
    expect(response.respond).toHaveBeenNthCalledWith(1, allowEffects, 405, {
      error: {
        code: 'method_not_allowed',
        message: 'Only POST is allowed.',
      },
    });
    await createCheckoutSessionExpressHandle(dependencies)(
      allowEffects,
      request(),
      response
    );
    expect(response.set).toHaveBeenCalledWith(
      allowEffects,
      'Cache-Control',
      'no-store'
    );
    expect(response.respond).toHaveBeenNthCalledWith(
      2,
      allowEffects,
      201,
      expect.objectContaining({ checkoutSessionId: 'cs_test_1' })
    );
  });
});
