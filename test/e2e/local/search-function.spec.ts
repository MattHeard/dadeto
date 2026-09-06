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
            latitude: 52.510833,
            longitude: 13.296667,
          },
          endPoint: {
            pointId: 'PICKUP',
            timestamp: '2026-01-01T20:00:00Z',
            latitude: 52.510833,
            longitude: 13.296667,
          },
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

test('static search page renders available football result', async ({ page }) => {
  await page.goto('/object-minute-rental-search/');
  await page.locator('[name="deliveryLatitude"]').fill('52.510833');
  await page.locator('[name="deliveryLongitude"]').fill('13.296667');
  await page.locator('[name="pickupLatitude"]').fill('52.510833');
  await page.locator('[name="pickupLongitude"]').fill('13.296667');
  await page.locator('[name="deliveryTime"]').fill('2026-01-01T19:00');
  await page.locator('[name="pickupTime"]').fill('2026-01-01T20:00');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('#search-status')).toHaveText(
    'Football is available for this possession window.'
  );
});
