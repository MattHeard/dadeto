import { expect, test, Page } from '@playwright/test';

async function labState(page: Page) {
  return page.evaluate(() => {
    const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')['neon-covenant-saves-v2'];
    return saves?.slots?.[saves.activeSlot ?? 0] ? JSON.parse(saves.slots[saves.activeSlot ?? 0]).state : null;
  });
}

async function tap(page: Page, button: string, embedded = false) {
  const key = ({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' })[button] || button;
  const control = embedded ? page.locator(`#NEON1 [data-key="${key}"]`) : page.locator(`[data-action="${button}"]`);
  if (test.info().project.name === 'phone') await control.tap();
  else if (embedded) await control.click();
  else await page.keyboard.press(key, { delay: 150 });
  await page.waitForTimeout(280);
}

test('phone and desktop have readable first-run intro, modal controls and an explicit shift clock', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/neon-covenant/');
  await expect.poll(async () => (await labState(page))?.dialogue?.actorId).toBe('intro');
  expect(await page.locator('[data-action]').count()).toBe(8);
  await page.waitForTimeout(350);
  expect((await labState(page)).dialogue.index).toBe(0);
  await tap(page, 'a');
  expect((await labState(page)).dialogue.index).toBe(1);
  await tap(page, 'x');
  await tap(page, 'down');
  await tap(page, 'a');
  expect((await labState(page)).menu.page).toBe('dashboard');
  expect((await labState(page)).dialogue.index).toBe(1);
  await tap(page, 'x');
  await tap(page, 'b');
  await tap(page, 'a');
  expect((await labState(page)).menu.page).toBe('ledger');
  expect((await labState(page)).world.day).toBe(1);
  await tap(page, 'a');
  expect((await labState(page)).world.day).toBe(2);
  expect((await labState(page)).lab.cash).toBe(169);
  await tap(page, 'x');
  await tap(page, 'y');
  await tap(page, 'down');
  await tap(page, 'a');
  expect((await labState(page)).quickAction).toBe('research');
  await tap(page, 'b');
  expect((await labState(page)).menu.page).toBe('research');
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas!.width / canvas!.height).toBeCloseTo(160 / 144, 1);
  if (test.info().project.name === 'phone') {
    const pad = await page.locator('.touch-pad').boundingBox();
    expect(pad!.y + pad!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await page.screenshot({ path: `.tmp/neon-${test.info().project.name}.png` });
  expect(errors).toEqual([]);
});

test('embedded keypad and lazy manual use the independent lab campaign', async ({ page }) => {
  await page.goto('/');
  const toy = page.locator('#NEON1');
  await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  await tap(page, 'b', true);
  await expect.poll(async () => (await labState(page))?.dialogue).toBeNull();
  await tap(page, 'a', true);
  await expect.poll(async () => (await labState(page))?.menu?.page).toBe('ledger');
  await tap(page, 'a', true);
  await expect.poll(async () => (await labState(page))?.world.day).toBe(2);
  await toy.locator('[data-manual-toggle]').click();
  await expect(toy.locator('.manual-body')).toContainText('Only **Ledger');
  await page.goto('/neon-covenant/');
  await expect.poll(async () => (await labState(page))?.world.day).toBe(2);
});

test('a new-save director can deliver Atlas and finish independently through real controller menus', async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    (window as any).labTools = tools;
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: (tool: any) => tools.set(tool.name, tool), unregisterTool: (name: string) => tools.delete(name) } });
  });
  await page.goto('/neon-covenant/');
  await expect.poll(() => page.evaluate(() => (window as any).labTools.has('neon_act'))).toBe(true);
  const act = async (actions: string[]) => page.evaluate(actions => JSON.parse((window as any).labTools.get('neon_act').execute({ actions }).content[0].text).state, actions);
  const choose = async (command: string) => {
    const selection = await page.evaluate(async command => {
      const tools = (window as any).labTools;
      const state = JSON.parse(tools.get('neon_observe').execute().content[0].text).state;
      const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
      return { current: state.menu.selected, target: labEntries(state).findIndex((entry: string[]) => entry[1] === command) };
    }, command);
    expect(selection.target).toBeGreaterThanOrEqual(0);
    const steps = Array(Math.abs(selection.target - selection.current)).fill(selection.target > selection.current ? 'down' : 'up');
    return act([...steps, 'a']);
  };
  await act(['b']);
  for (let shift = 0; shift < 6; shift++) {
    await act(['x']); await choose('page:ledger'); await choose('shift'); await act(['x']);
  }
  await act(['x']); await choose('page:research'); await choose('evaluate');
  await act(['x']); await choose('page:research');
  let state = await choose('deploy');
  expect(state.lab.deployed).toEqual(['atlas']);
  for (let shift = 6; shift < 28; shift++) {
    await act(['x']); await choose('page:ledger'); state = await choose('shift');
    if (!state.lab.outcome) await act(['x']);
  }
  expect(state.lab.outcome).toBe('independent');
  expect(state.lab.cash).toBeGreaterThanOrEqual(state.lab.debt);
  expect(state.dialogue.actorId).toBe('resolution');
});
