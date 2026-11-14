import { expect, test } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true });

test('Paint fills the available viewport as controls collapse and the device rotates', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#PAIN1');
  const panel = page.locator('#PAIN1 [data-paint-surface]');
  const canvas = panel.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const before = await canvas.boundingBox();
  await page.touchscreen.tap(before!.x + 20, before!.y + 20);
  const bitmap = await canvas.evaluate(node =>
    (node as HTMLCanvasElement).toDataURL()
  );
  await panel.getByRole('button', { name: 'Full screen', exact: true }).tap();
  const expanded = await canvas.boundingBox();
  expect(expanded!.height).toBeGreaterThan(before!.height);
  expect(expanded!.y + expanded!.height).toBeCloseTo(844 - 12, 0);
  const summary = panel.locator('summary');
  await summary.tap();
  await expect(panel.getByLabel('Brush size')).toBeHidden();
  const collapsed = await canvas.boundingBox();
  expect(collapsed!.height).toBeGreaterThan(expanded!.height);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = await canvas.boundingBox();
    expect(bounds!.x).toBeCloseTo(12, 0);
    expect(bounds!.width).toBeCloseTo(viewport.width - 24, 0);
    expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height - 12, 0);
    expect(
      await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())
    ).toBe(bitmap);
  }
  await summary.tap();
  await expect(panel.getByLabel('Brush size')).toBeVisible();
  await panel.getByRole('button', { name: 'Exit full screen' }).tap();
  expect(
    await canvas.evaluate(node => (node as HTMLCanvasElement).toDataURL())
  ).toBe(bitmap);
});
