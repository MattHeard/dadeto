import { expect, test } from '@playwright/test';

test('sample disruption produces an inspectable response within two minutes', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const started = Date.now();
  await page.goto('/supply-chain-nowcasting/');
  await expect(
    page.getByRole('heading', { name: 'Supply Signals', exact: true })
  ).toBeVisible();
  await expect(page.locator('.notice')).toContainText('not a live forecast');
  await expect(page.locator('#scenario-status')).toContainText(
    'Synthetic sample ready'
  );
  await expect(page.locator('#baseline-result')).toContainText(
    '0 units total shortfall'
  );

  await page
    .getByRole('button', { name: 'Apply one-click disruption' })
    .click();
  await expect(page.locator('#baseline-result')).toHaveText(
    '30 units total shortfall · 50¢ baseline route cost'
  );
  await expect(page.locator('#scenario-status')).toContainText(
    'No supplier is contacted'
  );
  await expect(page.locator('#network-routes tr')).toHaveCount(2);
  const firstOption = page.locator('#mitigation-results tr').first();
  await expect(firstOption).toContainText('30 units');
  await expect(firstOption).toContainText('Feasible');
  await expect(firstOption).toContainText('¢');
  await expect(page.locator('#warning-signal')).toContainText(
    '2 days of warning'
  );

  await page.getByLabel('Warning lead time').selectOption('0');
  await expect(page.locator('#warning-signal')).toContainText(
    'CURRENT RESPONSE'
  );
  await expect(firstOption).toContainText('20 units');
  await page.getByLabel('Warning lead time').selectOption('2');
  await expect(firstOption).toContainText('30 units');

  const elapsedMs = Date.now() - started;
  expect(elapsedMs).toBeLessThan(120_000);
  await test.info().attach('supply-chain-response-plan', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await test.info().attach('supply-chain-interaction-record', {
    body: Buffer.from(
      JSON.stringify({
        route: '/supply-chain-nowcasting/',
        elapsedMs,
        baseline: await page.locator('#baseline-result').textContent(),
        firstOption: await firstOption.textContent(),
        signal: await page.locator('#warning-signal').textContent(),
        assessment:
          'Automated task completion and visible content; human comprehension not assessed.',
      })
    ),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: 'Reset route' }).click();
  await expect(page.locator('#baseline-result')).toContainText(
    '0 units total shortfall'
  );
});
