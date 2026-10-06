import { test, expect } from '@playwright/test';

test('plays and resets the untimed Chronoflow Archive Entry level', async ({ page }) => {
  await page.route('**/config.json', route =>
    route.fulfill({ json: { chronoflowTimeUrl: '/mock-clock' } }),
  );
  await page.route('**/mock-clock', route =>
    route.fulfill({ json: { epochMs: 1_800_000_000_000 } }),
  );
  await page.goto('/chronoflow/');

  await expect(page).toHaveTitle(/Chronoflow/);
  await expect(page.getByRole('heading', { level: 1, name: /Chronoflow/ })).toBeVisible();
  await expect(page.locator('#clock-status')).toContainText('Internet tide synchronized');
  await expect(page.locator('#clock-status')).toContainText('Tide:');

  await page.getByRole('button', { name: 'Open sluice' }).click();
  const advance = page.getByRole('button', { name: 'Advance water · 60 steps' });
  for (let batch = 0; batch < 30; batch += 1) {
    if (await page.locator('#chronoflow-status').textContent() === 'Archive chamber primed. Level complete.') break;
    await advance.click();
  }
  await expect(page.locator('#chronoflow-status')).toHaveText('Archive chamber primed. Level complete.');

  await page.getByRole('button', { name: 'Reset level' }).click();
  await expect(page.locator('#chronoflow-status')).toContainText('step 0');
  await expect(page.getByRole('button', { name: 'Open sluice' })).toBeEnabled();
});

test('keeps Chronoflow in untimed practice when Internet clock sync fails', async ({ page }) => {
  await page.route('**/config.json', route =>
    route.fulfill({ json: { chronoflowTimeUrl: '/mock-clock' } }),
  );
  await page.route('**/mock-clock', route =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/chronoflow/');

  await expect(page.locator('#clock-status')).toContainText('Internet tide unavailable');
  await expect(page.locator('#clock-status')).toContainText('Timed play is disabled');
  await expect(page.getByRole('button', { name: 'Open sluice' })).toBeEnabled();
});
