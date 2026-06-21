# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-key-credit-v2.spec.ts >> rejects unknown-key deductions and overdrafts
- Location: test/e2e/api-key-credit-v2.spec.ts:81:1

# Error details

```
Error: API_BASE_URL is required for api-key-credit-v2 e2e tests
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | function getApiBaseUrl() {
  4   |   const apiBaseUrl = process.env.API_BASE_URL;
  5   |   if (!apiBaseUrl) {
> 6   |     throw new Error('API_BASE_URL is required for api-key-credit-v2 e2e tests');
      |           ^ Error: API_BASE_URL is required for api-key-credit-v2 e2e tests
  7   |   }
  8   | 
  9   |   return apiBaseUrl;
  10  | }
  11  | 
  12  | function buildApiUrl(path: string) {
  13  |   return new URL(path, getApiBaseUrl()).toString();
  14  | }
  15  | 
  16  | test('returns zero for an unknown API key', async ({ request }) => {
  17  |   const response = await request.get(
  18  |     buildApiUrl('/api-keys/11111111-1111-1111-1111-111111111111/credit')
  19  |   );
  20  | 
  21  |   expect(response.status()).toBe(200);
  22  |   await expect(response.json()).resolves.toEqual({ credit: 0 });
  23  | });
  24  | 
  25  | test('adds credit, replays idempotently, and persists the snapshot', async ({
  26  |   request,
  27  | }) => {
  28  |   const uuid = '22222222-2222-2222-2222-222222222222';
  29  |   const eventId = '33333333-3333-3333-3333-333333333333';
  30  |   const url = buildApiUrl(`/api-keys/${uuid}/credit`);
  31  | 
  32  |   const firstResponse = await request.post(url, {
  33  |     data: {
  34  |       type: 'credit_added',
  35  |       eventId,
  36  |       amount: 25,
  37  |     },
  38  |   });
  39  |   expect(firstResponse.status()).toBe(201);
  40  |   await expect(firstResponse.json()).resolves.toEqual({
  41  |     credit: 25,
  42  |     type: 'credit_added',
  43  |     eventId,
  44  |     applied: true,
  45  |   });
  46  | 
  47  |   const replayResponse = await request.post(url, {
  48  |     data: {
  49  |       type: 'credit_added',
  50  |       eventId,
  51  |       amount: 25,
  52  |     },
  53  |   });
  54  |   expect(replayResponse.status()).toBe(201);
  55  |   await expect(replayResponse.json()).resolves.toEqual({
  56  |     credit: 25,
  57  |     type: 'credit_added',
  58  |     eventId,
  59  |     applied: true,
  60  |   });
  61  | 
  62  |   const balanceResponse = await request.get(url);
  63  |   expect(balanceResponse.status()).toBe(200);
  64  |   await expect(balanceResponse.json()).resolves.toEqual({ credit: 25 });
  65  | 
  66  |   const historyResponse = await request.get(`${url}/events`);
  67  |   expect(historyResponse.status()).toBe(200);
  68  |   await expect(historyResponse.json()).resolves.toEqual({
  69  |     events: [
  70  |       {
  71  |         type: 'credit_added',
  72  |         eventId,
  73  |         amount: 25,
  74  |         balanceBefore: 0,
  75  |         balanceAfter: 25,
  76  |       },
  77  |     ],
  78  |   });
  79  | });
  80  | 
  81  | test('rejects unknown-key deductions and overdrafts', async ({ request }) => {
  82  |   const missingUuid = '44444444-4444-4444-4444-444444444444';
  83  |   const overdraftUuid = '55555555-5555-5555-5555-555555555555';
  84  |   const eventId = '66666666-6666-6666-6666-666666666666';
  85  | 
  86  |   const missingResponse = await request.post(
  87  |     buildApiUrl(`/api-keys/${missingUuid}/credit`),
  88  |     {
  89  |       data: {
  90  |         type: 'credit_deducted',
  91  |         eventId: `${eventId}-missing`,
  92  |         amount: 3,
  93  |       },
  94  |     }
  95  |   );
  96  |   expect(missingResponse.status()).toBe(404);
  97  |   await expect(missingResponse.text()).resolves.toBe('Not found');
  98  | 
  99  |   const creditUrl = buildApiUrl(`/api-keys/${overdraftUuid}/credit`);
  100 |   const addResponse = await request.post(creditUrl, {
  101 |     data: {
  102 |       type: 'credit_added',
  103 |       eventId: `${eventId}-add`,
  104 |       amount: 10,
  105 |     },
  106 |   });
```