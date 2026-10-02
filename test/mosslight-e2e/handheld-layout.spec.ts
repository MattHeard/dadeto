import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 664 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`screen and keypad fit together at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/mosslight-valley/');
    await page.evaluate(() => document.fonts.ready);
    const screen = await page.locator('.screen-frame').boundingBox();
    const controls = await page.locator('.touch-pad').boundingBox();
    const prose = await page.locator('.chapter-copy').boundingBox();
    expect(screen).not.toBeNull();
    expect(controls).not.toBeNull();
    expect(screen!.y + screen!.height).toBeLessThanOrEqual(viewport.height);
    expect(controls!.y + controls!.height).toBeLessThanOrEqual(viewport.height);
    expect(prose!.y).toBeGreaterThanOrEqual(controls!.y + controls!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `.tmp/mosslight-handheld-${viewport.width}-${viewport.height}.png` });
  });
}
