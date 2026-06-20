import { expect, test } from '@playwright/test';

const CHECKOUT_API_KEY_UUID = '11111111-1111-1111-1111-111111111111';
const MAPPED_API_KEY_UUID = '22222222-2222-2222-2222-222222222222';
const MAPPED_CUSTOMER_ID = 'cus_e2e_mapping';

function getApiBaseUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required for payment-webhook e2e tests');
  }

  return apiBaseUrl;
}

function getWebhookBaseUrl() {
  const webhookBaseUrl = process.env.PAYMENT_WEBHOOK_URL;
  if (!webhookBaseUrl) {
    throw new Error('PAYMENT_WEBHOOK_URL is required for payment-webhook e2e tests');
  }

  return webhookBaseUrl;
}

function buildApiUrl(path: string) {
  return new URL(path, getApiBaseUrl()).toString();
}

async function postPaymentEvent(request, event) {
  return request.post(getWebhookBaseUrl(), {
    data: event,
  });
}

test('applies checkout credits, replays duplicates, and deducts refunds', async ({
  request,
}) => {
  const checkoutEvent = {
    id: 'evt_e2e_checkout_credit',
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: CHECKOUT_API_KEY_UUID,
        metadata: { credit_amount: '80' },
      },
    },
  };

  const checkoutResponse = await postPaymentEvent(request, checkoutEvent);
  expect(checkoutResponse.status()).toBe(201);
  await expect(checkoutResponse.json()).resolves.toEqual({
    credit: 80,
    type: 'credit_added',
    eventId: 'evt_e2e_checkout_credit',
    applied: true,
  });

  const replayResponse = await postPaymentEvent(request, checkoutEvent);
  expect(replayResponse.status()).toBe(200);
  await expect(replayResponse.json()).resolves.toEqual({
    duplicate: true,
    eventId: 'evt_e2e_checkout_credit',
  });

  const refundEvent = {
    id: 'evt_e2e_checkout_refund',
    type: 'charge.refunded',
    data: {
      object: {
        client_reference_id: CHECKOUT_API_KEY_UUID,
        metadata: { credit_amount: '30' },
      },
    },
  };

  const refundResponse = await postPaymentEvent(request, refundEvent);
  expect(refundResponse.status()).toBe(200);
  await expect(refundResponse.json()).resolves.toEqual({
    credit: 50,
    type: 'credit_deducted',
    eventId: 'evt_e2e_checkout_refund',
    applied: true,
  });

  const balanceResponse = await request.get(
    buildApiUrl(`/api-keys/${CHECKOUT_API_KEY_UUID}/credit`)
  );
  expect(balanceResponse.status()).toBe(200);
  await expect(balanceResponse.json()).resolves.toEqual({ credit: 50 });
});

test('resolves customer mappings for payment-intent events', async ({
  request,
}) => {
  const event = {
    id: 'evt_e2e_customer_mapping',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        customer: MAPPED_CUSTOMER_ID,
        metadata: { credit_amount: '12' },
      },
    },
  };

  const response = await postPaymentEvent(request, event);
  expect(response.status()).toBe(201);
  await expect(response.json()).resolves.toEqual({
    credit: 12,
    type: 'credit_added',
    eventId: 'evt_e2e_customer_mapping',
    applied: true,
  });

  const balanceResponse = await request.get(
    buildApiUrl(`/api-keys/${MAPPED_API_KEY_UUID}/credit`)
  );
  expect(balanceResponse.status()).toBe(200);
  await expect(balanceResponse.json()).resolves.toEqual({ credit: 12 });
});
