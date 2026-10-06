import { test, expect } from '@playwright/test';

test('plays Chronoflow and earns a timed record only on trusted high tide', async ({ page }) => {
  await page.route('**/config.json', route =>
    route.fulfill({ json: { chronoflowTimeUrl: '/mock-clock' } }),
  );
  await page.route('**/mock-clock', route =>
    route.fulfill({ json: { epochMs: 1_800_000_045_000 } }),
  );
  await page.goto('/chronoflow/');

  await expect(page).toHaveTitle(/Chronoflow/);
  await expect(page.getByRole('heading', { level: 1, name: /Chronoflow/ })).toBeVisible();
  await expect(page.locator('#clock-status')).toContainText('Internet tide synchronized');
  await expect(page.locator('#clock-status')).toContainText('Tide:');

  await page.locator('#start-timed').click();
  await expect(page.locator('#chronoflow-status')).toContainText('Timed attempt');
  await page.locator('.chronoflow-cell[data-cell="7"]').click();
  await page.getByRole('button', { name: /Carve channel at cell 8/ }).click();
  await expect(page.locator('.chronoflow-cell[data-cell="7"]')).toHaveAttribute('data-solid', 'false');
  await page.locator('#route-valve').click();
  await page.getByRole('button', { name: 'Open sluice' }).click();
  const advance = page.getByRole('button', { name: 'Advance water · 60 steps' });
  await advance.click();
  const flowingCell = page.locator('.chronoflow-cell[data-flow-direction="down"]').first();
  await expect(flowingCell).toBeVisible();
  await flowingCell.click();
  await expect(page.locator('#cell-readout')).toContainText('velocity');
  for (let batch = 0; batch < 30; batch += 1) {
    if ((await page.locator('#chronoflow-status').textContent())?.includes('Timed high-tide record')) break;
    await advance.click();
  }
  await expect(page.locator('#chronoflow-status')).toHaveText('Archive chamber primed. Timed high-tide record secured.');

  await page.getByRole('button', { name: 'Reset level' }).click();
  await expect(page.locator('#chronoflow-status')).toContainText('step 0');
  await expect(page.locator('.chronoflow-cell[data-cell="7"]')).toHaveAttribute('data-solid', 'true');
  await expect(page.getByRole('button', { name: 'Open sluice' })).toBeDisabled();
  await page.locator('#route-valve').click();
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
  await expect(page.locator('#start-timed')).toBeDisabled();
  await page.locator('.chronoflow-cell[data-cell="11"]').click();
  await page.getByRole('button', { name: /Carve channel at cell 12/ }).click();
  await page.locator('#route-valve').click();
  await expect(page.getByRole('button', { name: 'Open sluice' })).toBeEnabled();
  await page.getByRole('button', { name: 'Open sluice' }).click();
  const advance = page.getByRole('button', { name: 'Advance water · 60 steps' });
  for (let batch = 0; batch < 30; batch += 1) {
    if ((await page.locator('#chronoflow-status').textContent())?.includes('complete')) break;
    await advance.click();
  }
  await expect(page.locator('#chronoflow-status')).toHaveText(
    'Archive chamber primed. Practice complete; no timed record.',
  );
});
