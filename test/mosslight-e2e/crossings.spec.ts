import { expect, test } from '@playwright/test';
import { pauseController } from './controller';

test('marked area crossings work on the actual game page and the Hollow gate stays sealed', async ({ page }, testInfo) => {
  await page.goto('/mosslight-valley/');
  for (const sample of [
    { map: 'village', exit: 0, unlocked: false, target: 'shore', key: 'ArrowLeft' },
    { map: 'village', exit: 1, unlocked: false, target: 'orchard', key: 'ArrowRight' },
    { map: 'village', exit: 2, unlocked: false, target: 'village', key: 'ArrowUp' },
    { map: 'village', exit: 2, unlocked: true, target: 'hollow', key: 'ArrowUp' },
    { map: 'orchard', exit: 1, unlocked: false, target: 'hollow', key: 'ArrowRight' },
    { map: 'hollow', exit: 0, unlocked: false, target: 'village', key: 'ArrowDown' },
  ]) {
    await pauseController(page);
    await expect(page.locator('#game-status')).toContainText('Paused');
    await page.evaluate(async sample => {
      const base = '/core/browser/game/mosslight-valley/';
      const { CONTENT } = await import(`${base}content.js`);
      const { createSimulation } = await import(`${base}simulation.js`);
      const { serializeSave } = await import(`${base}save.js`);
      const state = createSimulation();
      const map = CONTENT.maps[sample.map];
      const exit = map.exits[sample.exit];
      state.world.map = map;
      state.world.mapId = sample.map;
      state.world.location = sample.map;
      state.world.player.x = exit.x + (sample.key === 'ArrowLeft' ? 1 : sample.key === 'ArrowRight' ? -1 : 0);
      state.world.player.y = exit.y + (sample.key === 'ArrowUp' ? 1 : sample.key === 'ArrowDown' ? -1 : 0);
      state.world.flags.wellOpen = sample.unlocked;
      localStorage.setItem('permanentData', JSON.stringify({ 'mosslight-valley-saves-v2': { slots: { '0': serializeSave(state) } } }));
    }, sample);
    await page.reload();
    await expect(page.locator('#game-screen')).toBeVisible();
    await page.locator('#game-screen').screenshot({ path: `.tmp/mosslight-crossing-${testInfo.project.name}-${sample.map}-${sample.exit}-${sample.unlocked}.png` });
    await page.keyboard.press(sample.key, { delay: 160 });
    await expect.poll(() => page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
      return JSON.parse(data['mosslight-valley-saves-v2'].slots['0']).state.world.mapId;
    })).toBe(sample.target);
  }
});
