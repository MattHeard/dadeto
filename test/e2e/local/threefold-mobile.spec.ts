import { expect, test } from '@playwright/test';
import fs from 'node:fs';

test('renders the Broken Gate handheld cleanly at narrow mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/threefold/');

  await expect(page).toHaveTitle(/THREEFOLD/);
  await expect(page.getByRole('heading', { name: 'THREEFOLD' })).toBeVisible();

  const screen = page.locator('#game-screen');
  await expect(screen).toBeVisible();
  await expect(screen).toHaveAttribute('width', '160');
  await expect(screen).toHaveAttribute('height', '144');
  await expect(screen).toHaveCSS('image-rendering', 'pixelated');

  await page.waitForFunction(() => {
    const canvas = document.querySelector('#game-screen');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, 160, 144).data;
    if (!pixels) return false;
    const colors = new Set();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] > 0)
        colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    return colors.size > 4;
  });

  const layout = await page.evaluate(() => {
    const screenRect = document.querySelector('#game-screen').getBoundingClientRect();
    const touchRect = document.querySelector('.touch-pad').getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      screen: { left: screenRect.left, right: screenRect.right, width: screenRect.width, height: screenRect.height },
      touchPad: { left: touchRect.left, right: touchRect.right },
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.screen.left).toBeGreaterThanOrEqual(0);
  expect(layout.screen.right).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.screen.width / layout.screen.height).toBeCloseTo(160 / 144, 2);
  expect(layout.touchPad.left).toBeGreaterThanOrEqual(0);
  expect(layout.touchPad.right).toBeLessThanOrEqual(layout.viewportWidth);
  await expect(page.getByRole('button', { name: 'Move up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'A button: grow' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'B button: shrink' })).toBeVisible();

  fs.mkdirSync('reports', { recursive: true });
  await page.screenshot({ path: 'reports/threefold-mobile.png', fullPage: true });
});
