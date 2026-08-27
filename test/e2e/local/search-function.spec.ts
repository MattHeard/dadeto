import { test, expect } from '@playwright/test';

test('local object-minute rental search returns the football SKU', async ({
  request,
}) => {
  const baseUrl = process.env.API_BASE_URL;
  test.skip(!baseUrl, 'API_BASE_URL is not configured');
  const response = await request.post(
    `${baseUrl}/__sim/object-minute-rental-search`,
    {
      data: {
        searchText: 'football',
        possessionContext: {
          startPoint: {
            pointId: 'DELIVERY',
            timestamp: '2026-01-01T19:00:00Z',
          },
          endPoint: { pointId: 'PICKUP', timestamp: '2026-01-01T20:00:00Z' },
        },
      },
    }
  );
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    valid: true,
    results: [{ skuId: 'FOOTBALL' }],
  });
});
