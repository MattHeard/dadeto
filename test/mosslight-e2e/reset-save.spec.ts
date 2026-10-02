import { expect, test } from '@playwright/test';

async function readSaves(page: any) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('permanentData') || '{}'));
}

async function seedProgress(page: any) {
  await page.goto('/mosslight-valley/');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
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

test('standalone reset warns, cancels, resets only slot 02 and survives reload', async ({ page }) => {
  await seedProgress(page);
  await page.reload();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Save slot', { exact: true }).selectOption('1');
  const before = await readSaves(page);
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('slot 02');
    expect(dialog.message()).toContain('Export your save first');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Reset save', exact: true }).click();
  expect(await readSaves(page)).toEqual(before);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset save', exact: true }).click();
  await expectFresh(page, '1');
  expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['0']).toBe(before['mosslight-valley-saves-v2'].slots['0']);
  await expect(page.locator('#game-status')).toContainText('Paused');
  await page.reload();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByLabel('Save slot', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectFresh(page, '1');
});

test('embedded reset requires consent, preserves other slots and continues a fresh adventure', async ({ page }) => {
  await seedProgress(page);
  await page.goto('/');
  const toy = page.locator('#MOSS1');
  const reset = toy.getByRole('button', { name: 'Reset game', exact: true });
  await reset.scrollIntoViewIfNeeded();
  const before = await readSaves(page);
  page.once('dialog', dialog => dialog.dismiss());
  await reset.click();
  expect(await readSaves(page)).toEqual(before);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('slot 01');
    await dialog.accept();
  });
  await reset.click();
  await expect.poll(async () => JSON.parse((await readSaves(page))['mosslight-valley-saves-v2'].slots['0']).state.tick).toBe(0);
  await expectFresh(page, '0');
  expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['1']).toBe(before['mosslight-valley-saves-v2'].slots['1']);
  await page.reload();
  await toy.getByRole('button', { name: 'Right', exact: true }).click();
  await expect.poll(async () => JSON.parse((await readSaves(page))['mosslight-valley-saves-v2'].slots['0']).state.world.player.x).toBe(7);
  expect((await readSaves(page)).resetSentinel).toBe('keep me');
});
