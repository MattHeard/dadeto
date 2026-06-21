import { test, expect } from '@playwright/test';

function getApiBaseUrl() {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is required for api-key-credit-v2 e2e tests');
  }

  return apiBaseUrl;
}

function buildApiUrl(path: string) {
  return new URL(path, getApiBaseUrl()).toString();
}

test('returns zero for an unknown API key', async ({ request }) => {
  const response = await request.get(
    buildApiUrl('/api-keys/11111111-1111-1111-1111-111111111111/credit')
  );

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ credit: 0 });
});

test('adds credit, replays idempotently, and persists the snapshot', async ({
  request,
}) => {
  const uuid = '22222222-2222-2222-2222-222222222222';
  const eventId = '33333333-3333-3333-3333-333333333333';
  const url = buildApiUrl(`/api-keys/${uuid}/credit`);

  const firstResponse = await request.post(url, {
    data: {
      type: 'credit_added',
      eventId,
      amount: 25,
    },
  });
  expect(firstResponse.status()).toBe(201);
  await expect(firstResponse.json()).resolves.toEqual({
    credit: 25,
    type: 'credit_added',
    eventId,
    applied: true,
  });

  const replayResponse = await request.post(url, {
    data: {
      type: 'credit_added',
      eventId,
      amount: 25,
    },
  });
  expect(replayResponse.status()).toBe(201);
  await expect(replayResponse.json()).resolves.toEqual({
    credit: 25,
    type: 'credit_added',
    eventId,
    applied: true,
  });

  const balanceResponse = await request.get(url);
  expect(balanceResponse.status()).toBe(200);
  await expect(balanceResponse.json()).resolves.toEqual({ credit: 25 });

  const historyResponse = await request.get(`${url}/events`);
  expect(historyResponse.status()).toBe(200);
  await expect(historyResponse.json()).resolves.toEqual({
    events: [
      {
        type: 'credit_added',
        eventId,
        amount: 25,
        balanceBefore: 0,
        balanceAfter: 25,
      },
    ],
  });
});

test('rejects unknown-key deductions and overdrafts', async ({ request }) => {
  const missingUuid = '44444444-4444-4444-4444-444444444444';
  const overdraftUuid = '55555555-5555-5555-5555-555555555555';
  const eventId = '66666666-6666-6666-6666-666666666666';

  const missingResponse = await request.post(
    buildApiUrl(`/api-keys/${missingUuid}/credit`),
    {
      data: {
        type: 'credit_deducted',
        eventId: `${eventId}-missing`,
        amount: 3,
      },
    }
  );
  expect(missingResponse.status()).toBe(404);
  await expect(missingResponse.text()).resolves.toBe('Not found');

  const creditUrl = buildApiUrl(`/api-keys/${overdraftUuid}/credit`);
  const addResponse = await request.post(creditUrl, {
    data: {
      type: 'credit_added',
      eventId: `${eventId}-add`,
      amount: 10,
    },
  });
  expect(addResponse.status()).toBe(201);

  const deductResponse = await request.post(creditUrl, {
    data: {
      type: 'credit_deducted',
      eventId: `${eventId}-deduct`,
      amount: 4,
    },
  });
  expect(deductResponse.status()).toBe(200);
  await expect(deductResponse.json()).resolves.toEqual({
    credit: 6,
    type: 'credit_deducted',
    eventId: `${eventId}-deduct`,
    applied: true,
  });

  const overdraftResponse = await request.post(creditUrl, {
    data: {
      type: 'credit_deducted',
      eventId: `${eventId}-overdraft`,
      amount: 7,
    },
  });
  expect(overdraftResponse.status()).toBe(409);
  await expect(overdraftResponse.text()).resolves.toBe('Insufficient credit');
});
