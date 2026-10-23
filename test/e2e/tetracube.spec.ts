import { expect, test } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

test('records a touch and keyboard tower-building session', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tetracube/');

  await expect(page).toHaveTitle(/Tetracube/);
  await expect(
    page.getByRole('heading', { name: 'Build one piece at a time.' })
  ).toBeVisible();

  const canvas = page.locator('#tetracube-world');
  const structure = page.locator('#structure-readout');
  const status = page.locator('#tetracube-status');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move forward' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fly up' })).toBeVisible();
  await expect(page.locator('#piece-readout')).toHaveText(
    /tetracube-\d+ · #[0-9a-f]{6}/i
  );
  await expect(structure).toContainText('0 placed');

  const renderedFrame = () =>
    canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  const initialFrame = await renderedFrame();

  await page.getByRole('button', { name: 'Adjust ghost left' }).tap();
  expect(await renderedFrame()).not.toBe(initialFrame);
  await page.getByRole('button', { name: 'Adjust ghost right' }).tap();

  await canvas.press('r');
  const rotatedFrame = await renderedFrame();
  expect(rotatedFrame).not.toBe(initialFrame);
  await canvas.press('f');

  const place = page.getByRole('button', { name: 'Place the previewed piece' });
  await place.tap();
  await expect(structure).toContainText('1 placed');
  await expect(status).toContainText('placed. A new piece is ready.');
  await place.tap();
  await expect(structure).toContainText('2 placed');

  // This deterministic default stream places a long piece after two supports;
  // move it one grid cell to create an overhanging bridge in the tower.
  await page.getByRole('button', { name: 'Adjust ghost left' }).tap();
  await place.tap();
  await expect(structure).toContainText('3 placed');
  await place.tap();
  await expect(structure).toContainText('4 placed');
  await place.tap();
  await expect(structure).toContainText('5 placed');

  await test.info().attach('tetracube-tower-and-overhang', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  await test.info().attach('tetracube-interaction-record', {
    body: Buffer.from(
      JSON.stringify({
        route: '/tetracube/',
        input: ['touch ghost-left/right', 'keyboard rotate-x', 'touch place'],
        placements: 5,
        observedStatus: await status.textContent(),
        structureReadout: await structure.textContent(),
        enjoyment: 'not assessed by automation',
      })
    ),
    contentType: 'application/json',
  });

  await page.getByRole('button', { name: 'Mine the piece under the crosshair' }).tap();
  await expect(structure).toContainText('4 placed');
  await expect(status).toContainText('Piece mined. Unsupported pieces settled.');

  await page.getByRole('button', { name: 'Undo' }).tap();
  await expect(structure).toContainText('5 placed');
  await expect(status).toHaveText('Undone.');

  await page.getByRole('button', { name: 'Reset world' }).tap();
  await expect(structure).toContainText('0 placed');

  await canvas.press('Enter');
  await expect(structure).toContainText('1 placed');
  await canvas.press('z');
  await expect(structure).toContainText('0 placed');

  const beforeMove = await renderedFrame();
  await page.getByRole('button', { name: 'Move forward' }).tap();
  expect(await renderedFrame()).not.toBe(beforeMove);
  await page.getByRole('button', { name: 'Fly up' }).tap();
  expect(await renderedFrame()).not.toBe(beforeMove);
});
