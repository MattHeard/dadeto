import { expect, test } from '@playwright/test';

for (const route of ['/', '/mosslight-valley/']) {
  test(`dialogue stays inside the canvas on ${route}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('.mosslight-keypad'));
    await page.evaluate(async () => {
      const base = '/core/browser/game/mosslight-valley/';
      const { CONTENT } = await import(`${base}content.js`);
      const { createSimulation } = await import(`${base}simulation.js`);
      const { openDialogue } = await import(`${base}dialogue.js`);
      const { serializeSave } = await import(`${base}save.js`);
      const state = openDialogue(createSimulation(CONTENT), 'juniper', [
        { text: 'I make bells for doors that have not been built yet.' },
      ]);
      localStorage.setItem('permanentData', JSON.stringify({
        'mosslight-valley-saves-v2': { slots: { '0': serializeSave(state) } },
      }));
    });
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.fillRect;
      (window as any).dialogueRows = [];
      (window as any).fontCalls = 0;
      const textOriginal = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (...args) {
        if (this.canvas.width === 160 && this.canvas.height === 144) (window as any).fontCalls++;
        textOriginal.apply(this, args);
      };
      CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
        if (width === 1 && height === 1 && y >= 60 && y < 106 && this.canvas.width === 160 && this.canvas.height === 144) {
          (window as any).dialogueRows.push({ x, y, width, height });
        }
        original.call(this, x, y, width, height);
      };
    });
    await page.goto(route);
    const canvas = page.locator(route === '/' ? '#MOSS1 canvas' : '#game-screen');
    if (route === '/') {
      const toy = page.locator('#MOSS1');
      await toy.scrollIntoViewIfNeeded();
      await expect(toy.locator('.mosslight-keypad')).toBeVisible();
      await toy.getByRole('button', { name: 'Submit', exact: true }).click();
    }
    await expect(canvas).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).dialogueRows.some((row: any) => row.x >= 8 && row.y === 88))).toBe(true);
    const rows = await page.evaluate(() => (window as any).dialogueRows);
    expect(rows.every((row: any) => Number.isInteger(row.x) && Number.isInteger(row.y))).toBe(true);
    expect(await page.evaluate(() => (window as any).fontCalls)).toBe(0);
    const colours = await canvas.evaluate((element: HTMLCanvasElement) => {
      const pixels = element.getContext('2d')!.getImageData(8, 68, 140, 27).data;
      return Array.from({ length: pixels.length / 4 }, (_, i) => Array.from(pixels.slice(i * 4, i * 4 + 4)).join(','));
    });
    expect(new Set(colours).size).toBe(2);
    await canvas.screenshot({ path: `/tmp/dadeto-dialogue-${testInfo.project.name}-${route === '/' ? 'embedded' : 'page'}.png` });
  });
}
