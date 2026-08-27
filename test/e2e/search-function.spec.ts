import { test, expect } from '@playwright/test';

const searchUrl = process.env.OBJECT_MINUTE_RENTAL_SEARCH_URL;

function tomorrowAt(hour: number) {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

test('object-minute rental search returns the football SKU', async ({
  request,
}) => {
  test.skip(!searchUrl, 'OBJECT_MINUTE_RENTAL_SEARCH_URL is not configured');
  const response = await request.post(searchUrl as string, {
    data: {
      searchText: 'football',
      possessionContext: {
        startPoint: { pointId: 'DELIVERY', timestamp: tomorrowAt(19) },
        endPoint: { pointId: 'PICKUP', timestamp: tomorrowAt(20) },
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    valid: true,
    results: [{ skuId: 'FOOTBALL' }],
  });
});
