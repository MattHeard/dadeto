# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment-webhook.spec.ts >> resolves customer mappings for payment-intent events
- Location: test/e2e/payment-webhook.spec.ts:115:1

# Error details

```
Error: PAYMENT_WEBHOOK_URL is required for payment-webhook e2e tests
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | const CHECKOUT_API_KEY_UUID = '11111111-1111-1111-1111-111111111111';
  4   | const MAPPED_API_KEY_UUID = '33333333-3333-4333-8333-333333333333';
  5   | const MAPPED_CUSTOMER_ID = 'cus_e2e_mapping';
  6   | 
  7   | function getApiBaseUrl() {
  8   |   const apiBaseUrl = process.env.API_BASE_URL;
  9   |   if (!apiBaseUrl) {
  10  |     throw new Error('API_BASE_URL is required for payment-webhook e2e tests');
  11  |   }
  12  | 
  13  |   return apiBaseUrl;
  14  | }
  15  | 
  16  | function getWebhookBaseUrl() {
  17  |   const webhookBaseUrl = process.env.PAYMENT_WEBHOOK_URL;
  18  |   if (!webhookBaseUrl) {
> 19  |     throw new Error('PAYMENT_WEBHOOK_URL is required for payment-webhook e2e tests');
      |           ^ Error: PAYMENT_WEBHOOK_URL is required for payment-webhook e2e tests
  20  |   }
  21  | 
  22  |   return webhookBaseUrl;
  23  | }
  24  | 
  25  | function buildApiUrl(path: string) {
  26  |   return new URL(path, getApiBaseUrl()).toString();
  27  | }
  28  | 
  29  | async function postPaymentEvent(request, event) {
  30  |   return request.post(getWebhookBaseUrl(), {
  31  |     data: event,
  32  |   });
  33  | }
  34  | 
  35  | test('applies checkout credits, replays duplicates, and deducts refunds', async ({
  36  |   request,
  37  | }) => {
  38  |   const checkoutEvent = {
  39  |     id: 'evt_e2e_checkout_credit',
  40  |     type: 'checkout.session.completed',
  41  |     data: {
  42  |       object: {
  43  |         client_reference_id: CHECKOUT_API_KEY_UUID,
  44  |         metadata: { credit_amount: '80' },
  45  |       },
  46  |     },
  47  |   };
  48  | 
  49  |   const checkoutResponse = await postPaymentEvent(request, checkoutEvent);
  50  |   expect(checkoutResponse.status()).toBe(201);
  51  |   await expect(checkoutResponse.json()).resolves.toEqual({
  52  |     credit: 80,
  53  |     type: 'credit_added',
  54  |     eventId: 'evt_e2e_checkout_credit',
  55  |     applied: true,
  56  |   });
  57  | 
  58  |   const replayResponse = await postPaymentEvent(request, checkoutEvent);
  59  |   expect(replayResponse.status()).toBe(200);
  60  |   await expect(replayResponse.json()).resolves.toEqual({
  61  |     duplicate: true,
  62  |     eventId: 'evt_e2e_checkout_credit',
  63  |   });
  64  | 
  65  |   const refundEvent = {
  66  |     id: 'evt_e2e_checkout_refund',
  67  |     type: 'charge.refunded',
  68  |     data: {
  69  |       object: {
  70  |         client_reference_id: CHECKOUT_API_KEY_UUID,
  71  |         metadata: { credit_amount: '30' },
  72  |       },
  73  |     },
  74  |   };
  75  | 
  76  |   const refundResponse = await postPaymentEvent(request, refundEvent);
  77  |   expect(refundResponse.status()).toBe(200);
  78  |   await expect(refundResponse.json()).resolves.toEqual({
  79  |     credit: 50,
  80  |     type: 'credit_deducted',
  81  |     eventId: 'evt_e2e_checkout_refund',
  82  |     applied: true,
  83  |   });
  84  | 
  85  |   const balanceResponse = await request.get(
  86  |     buildApiUrl(`/api-keys/${CHECKOUT_API_KEY_UUID}/credit`)
  87  |   );
  88  |   expect(balanceResponse.status()).toBe(200);
  89  |   await expect(balanceResponse.json()).resolves.toEqual({ credit: 50 });
  90  | 
  91  |   const historyResponse = await request.get(
  92  |     buildApiUrl(`/api-keys/${CHECKOUT_API_KEY_UUID}/credit/events`)
  93  |   );
  94  |   expect(historyResponse.status()).toBe(200);
  95  |   await expect(historyResponse.json()).resolves.toEqual({
  96  |     events: [
  97  |       {
  98  |         type: 'credit_added',
  99  |         eventId: 'evt_e2e_checkout_credit',
  100 |         amount: 80,
  101 |         balanceBefore: 0,
  102 |         balanceAfter: 80,
  103 |       },
  104 |       {
  105 |         type: 'credit_deducted',
  106 |         eventId: 'evt_e2e_checkout_refund',
  107 |         amount: 30,
  108 |         balanceBefore: 80,
  109 |         balanceAfter: 50,
  110 |       },
  111 |     ],
  112 |   });
  113 | });
  114 | 
  115 | test('resolves customer mappings for payment-intent events', async ({
  116 |   request,
  117 | }) => {
  118 |   const event = {
  119 |     id: 'evt_e2e_customer_mapping',
```