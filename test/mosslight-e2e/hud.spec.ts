import { expect, test } from '@playwright/test';

for (const route of ['/', '/mosslight-valley/']) {
  test(`HUD and terrain fill the viewport on ${route}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('.mosslight-keypad'));
    await page.evaluate(async () => {
      const base = '/core/browser/game/mosslight-valley/';
      const { CONTENT } = await import(`${base}content.js`);
      const { createSimulation } = await import(`${base}simulation.js`);
      const { serializeSave } = await import(`${base}save.js`);
      const state = createSimulation(CONTENT);
      state.toast = 'Water the plot, then let one day pass.';
      localStorage.setItem('permanentData', JSON.stringify({
        'mosslight-valley-saves-v2': { slots: { '0': serializeSave(state) } },
      }));
    });
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.fillRect;
      (window as any).hudRows = [];
      CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
        if (width === 1 && height === 1 && y >= 108 && this.canvas.width === 160 && this.canvas.height === 144) {
          (window as any).hudRows.push({ x, y, width, height });
        }
        original.call(this, x, y, width, height);
      };
    });
    await page.goto(route);
    const canvas = page.locator(route === '/' ? '#MOSS1 canvas' : '#game-screen');
    if (route === '/') {
      const toy = page.locator('#MOSS1');
      await toy.scrollIntoViewIfNeeded();
      await toy.getByRole('button', { name: 'Submit', exact: true }).click();
    }
    await expect(canvas).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).hudRows.length)).toBeGreaterThanOrEqual(4);
    const rows = await page.evaluate(() => (window as any).hudRows);
    expect(rows.every((row: any) => row.x + row.width <= 156 && row.y < 144)).toBe(true);
    expect(rows.every((row: any) => Number.isInteger(row.x) && Number.isInteger(row.y))).toBe(true);
    const edge = await canvas.evaluate((element: HTMLCanvasElement) => {
      const data = element.getContext('2d')!.getImageData(159, 0, 1, 108).data;
      return Array.from({ length: 108 }, (_, i) => Array.from(data.slice(i * 4, i * 4 + 4)));
    });
    expect(edge.every(pixel => pixel[3] === 255 && pixel.slice(0, 3).some(channel => channel !== 255))).toBe(true);
    await canvas.screenshot({ path: `/tmp/dadeto-hud-${testInfo.project.name}-${route === '/' ? 'embedded' : 'page'}.png` });
  });
}
