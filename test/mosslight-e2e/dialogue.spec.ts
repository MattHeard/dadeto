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
      const original = CanvasRenderingContext2D.prototype.fillText;
      (window as any).dialogueRows = [];
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
        if (x === 8 && this.canvas.width === 160 && this.canvas.height === 144) {
          (window as any).dialogueRows.push({ text, x, y, width: this.measureText(text).width });
        }
        original.call(this, text, x, y, ...args);
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
    await expect.poll(() => page.evaluate(() => (window as any).dialogueRows.some((row: any) => row.text.includes('built yet.')))).toBe(true);
    const rows = await page.evaluate(() => (window as any).dialogueRows);
    expect(rows.every((row: any) => row.x + row.width <= 152 && row.y > 0 && row.y < 106)).toBe(true);
    expect(rows.some((row: any) => row.text === 'A/Z continue')).toBe(true);
    await canvas.screenshot({ path: `/tmp/dadeto-dialogue-${testInfo.project.name}-${route === '/' ? 'embedded' : 'page'}.png` });
  });
}
