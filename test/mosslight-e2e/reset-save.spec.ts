import { expect, test } from '@playwright/test';
import { controllerUtility, chooseControllerEntry, pauseController, pressController, readControllerState } from './controller';

async function readSaves(page: any) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('permanentData') || '{}'));
}

async function seedProgress(page: any) {
  await page.goto('/mosslight-valley/');
  await pauseController(page);
  await expect(page.locator('#game-status')).toContainText('Paused');
  await page.evaluate(async () => {
    const base = '/core/browser/game/mosslight-valley/';
    const { createSimulation } = await import(`${base}simulation.js`);
    const { serializeSave } = await import(`${base}save.js`);
    const state = createSimulation();
    state.world.day = 5;
    state.world.player.x = 11;
    state.world.flags = { wellOpen: true, memoryCount: 3 };
    state.world.relationships.mira = 8;
    state.inventory = { dreamFragment: 9 };
    state.farm = { crop: 'moonTurnip', plantedDay: 1, wateredDay: 5 };
    state.journal = ['dreamFragment'];
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    data.resetSentinel = 'keep me';
    data['mosslight-valley-saves-v2'] = { slots: { '0': serializeSave(state, 0), '1': serializeSave(state, 1) } };
    localStorage.setItem('permanentData', JSON.stringify(data));
  });
}

async function expectFresh(page: any, slot: string) {
  const data = await readSaves(page);
  const saved = JSON.parse(data['mosslight-valley-saves-v2'].slots[slot]);
  expect(saved.slot).toBe(Number(slot));
  expect(saved.state.world.player.x).toBe(6);
  expect(saved.state.world.day).toBe(1);
  expect(saved.state.world.flags).toEqual({});
  expect(saved.state.world.relationships.mira).toBe(0);
  expect(saved.state.inventory).toEqual({ moonSeed: 1, hearthTea: 1 });
  expect(saved.state.farm).toEqual({ crop: null, plantedDay: null, wateredDay: null });
  expect(saved.state.journal).toEqual([]);
  expect(saved.state.dialogue).toBeNull();
  expect(saved.state.battle).toBeNull();
  expect(saved.state.ending).toBeNull();
  expect(data.resetSentinel).toBe('keep me');
}

test('standalone menu reset cancels safely, resets only slot 02 and survives reload', async ({ page }) => {
  test.setTimeout(90_000);
  await seedProgress(page);
  await page.reload();
  await controllerUtility(page, 'slot:1');
  const before = await readSaves(page);
  await controllerUtility(page, 'page:reset');
  await chooseControllerEntry(page, 'page:main');
  expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  await controllerUtility(page, 'page:reset');
  await chooseControllerEntry(page, 'reset');
  await expectFresh(page, '1');
  expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['0']).toBe(before['mosslight-valley-saves-v2'].slots['0']);
  await page.reload();
  expect((await readSaves(page))['mosslight-valley-saves-v2'].activeSlot).toBe(1);
  await expectFresh(page, '1');
});

test('embedded menu reset preserves other slots and slot switching persists between presses', async ({ page }) => {
  test.setTimeout(90_000);
  await seedProgress(page);
  await page.goto('/');
  const toy = page.locator('#MOSS1');
  await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  const before = await readSaves(page);
  await controllerUtility(page, 'page:reset', true);
  await chooseControllerEntry(page, 'page:main', true);
  expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  await controllerUtility(page, 'page:reset', true);
  await chooseControllerEntry(page, 'reset', true);
  await expectFresh(page, '0');
  expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['1']).toBe(before['mosslight-valley-saves-v2'].slots['1']);
  await pressController(page, 'right', true);
  expect((await readControllerState(page)).world.player.x).toBe(7);
  await controllerUtility(page, 'slot:1', true);
  await pressController(page, 'x', true);
  expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  expect((await readSaves(page))['mosslight-valley-saves-v2'].activeSlot).toBe(1);
  await page.reload();
  await pressController(page, 'x', true);
  expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  expect((await readSaves(page)).resetSentinel).toBe('keep me');
});
