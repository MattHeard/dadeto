import { expect, test } from '@playwright/test';
import { controllerUtility, readControllerState } from './controller';

test('save export and import are accessible through the eight-button menu', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/mosslight-valley/');
  const downloadEvent = page.waitForEvent('download');
  await controllerUtility(page, 'export');
  expect((await downloadEvent).suggestedFilename()).toBe('mosslight-valley-save.json');
  const portable = await page.evaluate(async () => {
    const { serializeSave } = await import('/core/browser/game/mosslight-valley/save.js');
    const saves = JSON.parse(localStorage.getItem('permanentData')!)['mosslight-valley-saves-v2'];
    const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
    state.quickAction = 'rest';
    state.menu = null;
    return serializeSave(state);
  });
  const chooserEvent = page.waitForEvent('filechooser');
  await controllerUtility(page, 'import');
  await (await chooserEvent).setFiles({ name: 'mosslight.json', mimeType: 'application/json', buffer: Buffer.from(portable) });
  await expect.poll(async () => (await readControllerState(page))?.quickAction).toBe('rest');
});

async function state(page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const raw = data['mosslight-valley-saves-v2']?.slots?.['0'];
    return raw ? JSON.parse(raw).state : null;
  });
}

test('real handheld taps assign B and journal closes without hidden dialogue focus', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/mosslight-valley/');
  const controls = page.locator('[data-action]');
  expect(await controls.count()).toBe(8);
  expect(await controls.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-action')).sort())).toEqual(['a', 'b', 'down', 'left', 'right', 'up', 'x', 'y']);
  const press = async (action: string) => {
    const button = page.locator(`[data-action="${action}"]`);
    if (test.info().project.name === 'phone') await button.tap();
    else { await page.keyboard.down(action === 'down' ? 'ArrowDown' : action); }
    await page.waitForTimeout(300);
    if (test.info().project.name !== 'phone') { await page.keyboard.up(action === 'down' ? 'ArrowDown' : action); await page.waitForTimeout(150); }
  };
  await press('y');
  await expect.poll(async () => (await state(page))?.menu?.page).toBe('assign');
  await press('down'); await press('down'); await press('a');
  await expect.poll(async () => (await state(page))?.quickAction).toBe('wait');
  const before = await state(page);
  await press('b');
  await expect.poll(async () => (await state(page))?.world.time).toBe(before.world.time + 1);
  await press('x'); await press('down'); await press('down'); await press('a');
  await expect.poll(async () => (await state(page))?.menu?.page).toBe('journal');
  await page.screenshot({ path: `.tmp/mosslight-eight-journal-${test.info().project.name}.png` });
  await press('x');
  await expect.poll(async () => (await state(page))?.menu).toBeNull();
  await press('x'); await press('down'); await press('down'); await press('down'); await press('a');
  await expect.poll(async () => (await state(page))?.dialogue?.actorId).toBe('guide');
  await press('a');
  await expect.poll(async () => (await state(page))?.dialogue?.index).toBe(1);
  await press('b');
  await expect.poll(async () => (await state(page))?.dialogue).toBeNull();
  await expect(page.getByRole('button', { name: 'START', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'SELECT', exact: true })).toHaveCount(0);
});

test('embedded keypad uses the same eight-button assignment rules', async ({ page }) => {
  await page.goto('/');
  const toy = page.locator('#MOSS1');
  await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  const press = async (key: string) => {
    await toy.locator(`button[data-key="${key}"]`).click();
    await page.waitForTimeout(150);
  };
  await press('y'); await press('ArrowDown'); await press('ArrowDown'); await press('a');
  await expect.poll(async () => (await state(page))?.quickAction).toBe('wait');
  const before = await state(page);
  await press('b');
  await expect.poll(async () => (await state(page))?.world.time).toBe(before.world.time + 1);
  await expect(toy.locator('button[data-key]')).toHaveCount(8);
});
