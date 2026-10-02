import { expect, test } from '@playwright/test';

test('restored Field Journal consumes world actions and X closes it', async ({ page }) => {
  await page.goto('/mosslight-valley/');
  await page.evaluate(async () => {
    const { createSimulation } = await import('/core/browser/game/mosslight-valley/simulation.js');
    const { serializeSave } = await import('/core/browser/game/mosslight-valley/save.js');
    const state = createSimulation();
    state.mode = 'journal';
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    data['mosslight-valley-saves-v2'] = { slots: { '0': serializeSave(state) } };
    localStorage.setItem('permanentData', JSON.stringify(data));
  });
  await page.reload();
  const read = () => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    return JSON.parse(data['mosslight-valley-saves-v2'].slots['0']).state;
  });
  await page.waitForTimeout(300);
  const before = await read();
  await page.keyboard.down('q');
  await page.waitForTimeout(300);
  await page.keyboard.up('q');
  const after = await read();
  expect(after.mode).toBe('journal');
  expect(after.toast).toBe(before.toast);
  await page.keyboard.down('X');
  await page.waitForTimeout(300);
  await page.keyboard.up('X');
  await expect.poll(async () => (await read()).mode).toBe('world');
});
