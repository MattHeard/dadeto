import { expect, test, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
});

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

async function selectPersonnelRow(page: Page, command: string, embedded = false) {
  const selection = await page.evaluate(async command => {
    const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')['neon-covenant-saves-v2'];
    const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
    const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
    return { current: state.menu.selected, target: labEntries(state).findIndex((row: string[]) => row[1] === command) };
  }, command);
  expect(selection.target).toBeGreaterThanOrEqual(0);
  for (let index = selection.current; index > selection.target; index--) await tap(page, 'up', embedded);
  for (let index = selection.current; index < selection.target; index++) await tap(page, 'down', embedded);
  await tap(page, 'a', embedded);
}

async function openForecast(page: Page, embedded: boolean) {
  await page.goto(embedded ? '/' : '/neon-covenant/', { waitUntil: 'domcontentloaded' });
  if (embedded) {
    const toy = page.locator('#NEON1');
    await toy.scrollIntoViewIfNeeded();
    await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  }
  await tap(page, 'b', embedded);
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(2);
  await tap(page, 'a', embedded);
  await selectPersonnelRow(page, 'page:forecast', embedded);
  return labState(page);
}

for (const embedded of [false, true]) {
  for (const repair of [false, true]) {
    test(`first shift cooling ${repair ? 'repair' : 'decline'} uses real rules in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(embedded ? '/' : '/neon-covenant/', { waitUntil: 'domcontentloaded' });
      if (embedded) {
        await page.locator('#NEON1').scrollIntoViewIfNeeded();
        await expect(page.locator('#NEON1').getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
      }
      await tap(page, 'b', embedded);
      await tap(page, 'x', embedded);
      await tap(page, 'up', embedded);
      await tap(page, 'a', embedded);
      expect((await labState(page)).menu.page).toBe('orientation');
      await tap(page, 'a', embedded);
      expect((await labState(page)).lab.cash).toBe(208);
      if (!repair) await tap(page, 'down', embedded);
      await tap(page, 'a', embedded);
      let state = await labState(page);
      expect(state.lab.cooling).toBe(repair ? 8 : 4);
      expect(state.lab.decisions).toBe(repair ? 4 : 5);
      await selectPersonnelRow(page, 'lesson:decline', embedded);
      await tap(page, 'a', embedded);
      state = await labState(page);
      expect(state.dialogue.actorId).toBe('forecast');
      expect(state.lab.firstShiftGuide).toBe(4);
      const projected = state.presentation.forecast;
      expect(state.world.day).toBe(1);
      await tap(page, 'b', embedded);
      await tap(page, 'x', embedded);
      await tap(page, 'up', embedded);
      await tap(page, 'a', embedded);
      await tap(page, 'a', embedded);
      state = await labState(page);
      expect(state.world.day).toBe(2);
      expect(state.lab.cash).toBe(projected.closingCash);
      expect(state.lab.research.atlas).toBe(repair ? 7 : 5);
      expect(state.lab.deployed).toEqual([]);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `.tmp/neon-first-shift-${repair ? 'repair' : 'decline'}-${embedded ? 'embedded' : 'standalone'}-${test.info().project.name}.png` });
    });
  }
  test(`forecast previews are free, readable and exact in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const opening = await openForecast(page, embedded);
    const projected = opening.presentation.forecast;
    expect(projected.closingCash).toBe(170);
    expect(projected.bottleneck.kind).toBe('cooling');
    await selectPersonnelRow(page, 'preview-shift', embedded);
    let state = await labState(page);
    expect(state.dialogue.actorId).toBe('forecast');
    expect(state.dialogue.lines.map((line: any) => line.text).join(' ')).toContain('Closing cash 170k');
    expect(state.lab).toEqual(opening.lab);
    expect(state.world.day).toBe(opening.world.day);
    expect(await page.evaluate(async () => {
      const saves = JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'];
      const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
      const { wrapDialogueText } = await import('/core/browser/game/mosslight-valley/renderer.js');
      return state.dialogue.lines.every((line: any) => wrapDialogueText(line.text).length <= 6);
    })).toBe(true);
    await page.screenshot({ path: `.tmp/neon-forecast-${embedded ? 'embedded' : 'standalone'}-${test.info().project.name}.png` });
    await tap(page, 'b', embedded);
    await tap(page, 'a', embedded);
    await tap(page, 'a', embedded);
    state = await labState(page);
    expect(state.lab.cash).toBe(projected.closingCash);
    expect(state.lab.research.atlas).toBe(projected.checkpoint);
    expect(state.lab.employees.map((person: any) => person.fatigue)).toEqual(projected.employees.map((person: any) => person.fatigue));
    expect(state.world.day).toBe(2);
    expect(errors).toEqual([]);
  });

  test(`order comparisons do not spend cash or attention in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const opening = await openForecast(page, embedded);
    await selectPersonnelRow(page, 'page:comparisons', embedded);
    await selectPersonnelRow(page, 'preview:racks', embedded);
    const state = await labState(page);
    const text = state.dialogue.lines.map((line: any) => line.text).join(' ');
    expect(text).toContain('PREVIEW ONLY');
    expect(text).toContain('Cost 30k and 1 attention');
    expect(text).toContain('Research gain changes from 5 to 5');
    expect(text).toContain('Closing cash changes from 170k to 140k');
    expect(state.lab).toEqual(opening.lab);
    expect(state.world.day).toBe(1);
    expect(errors).toEqual([]);
  });
}

test('named staff are assignable and their readable concerns own controller input', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/neon-covenant/');
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(2);
  await tap(page, 'b');
  await tap(page, 'x');
  await selectPersonnelRow(page, 'page:recruitment');
  await selectPersonnelRow(page, 'page:employee:jun');
  await selectPersonnelRow(page, 'assign:jun:safety');
  expect((await labState(page)).lab.teams).toEqual({ research: 1, safety: 2, service: 1 });
  expect((await labState(page)).lab.decisions).toBe(5);
  await tap(page, 'x');
  await selectPersonnelRow(page, 'page:recruitment');
  await selectPersonnelRow(page, 'page:employee:ada');
  await selectPersonnelRow(page, 'thoughts:ada');
  const state = await labState(page);
  expect(state.dialogue.actorId).toBe('ada');
  expect(state.dialogue.lines[0].text).toContain('Cooling cannot serve every rack');
  await tap(page, 'a');
  expect((await labState(page)).dialogue).toBeNull();
  expect((await labState(page)).lab.decisions).toBe(5);
  expect((await labState(page)).world.day).toBe(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `.tmp/neon-personnel-${test.info().project.name}.png` });
});

for (const embedded of [false, true]) {
  test(`causal overheating warns and recovers through real controls in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openForecast(page, embedded);
    await selectPersonnelRow(page, 'page:ledger', embedded);
    await selectPersonnelRow(page, 'shift', embedded);
    const warned = await labState(page);
    expect(warned.lab.incidentChains.heat.stage).toBe('warning');
    expect(warned.lab.incidents).toBe(0);
    expect(warned.world.day).toBe(2);
    await tap(page, 'b', embedded);
    expect((await labState(page)).menu.page).toBe('main');
    await selectPersonnelRow(page, 'page:incidents', embedded);
    await selectPersonnelRow(page, 'preview:incident:heat', embedded);
    const preview = await labState(page);
    expect(preview.lab).toEqual(warned.lab);
    expect(preview.dialogue.lines.map((line: any) => line.text).join(' ')).toContain('Cost 20k and 1 attention');
    await tap(page, 'b', embedded);
    await tap(page, 'x', embedded);
    await selectPersonnelRow(page, 'page:incidents', embedded);
    await selectPersonnelRow(page, 'page:responses', embedded);
    await selectPersonnelRow(page, 'incident:heat', embedded);
    const repaired = await labState(page);
    expect(repaired.lab.cash).toBe(warned.lab.cash - 20);
    expect(repaired.lab.decisions).toBe(5);
    expect(repaired.lab.cooling).toBe(8);
    expect(repaired.lab.incidentChains.heat.stage).toBe('intervention');
    await tap(page, 'x', embedded);
    await selectPersonnelRow(page, 'page:ledger', embedded);
    await selectPersonnelRow(page, 'shift', embedded);
    expect((await labState(page)).lab.incidentChains.heat.stage).toBe('recovery');
    expect((await labState(page)).lab.incidents).toBe(0);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/neon-incidents-${test.info().project.name}-${embedded ? 'embedded' : 'standalone'}.png` });
  });
}

test('legacy mobile and desktop saves migrate losslessly and preserve a resettable backup', async ({ page }) => {
  await page.goto('/neon-covenant/');
  const original = await page.evaluate(async () => {
    const { createNeonState } = await import('/core/browser/game/neon-covenant/simulation.js');
    const state = createNeonState();
    delete state.lab.rulesVersion;
    delete state.lab.employees;
    Object.assign(state.lab, { cash: 137, debt: 94, hired: 6, teams: { research: 0, safety: 0, service: 6 }, promises: ['ada'] });
    state.world.day = 8;
    state.dialogue = null;
    const raw = JSON.stringify({ game: 'neon-covenant', version: 2, slot: 2, state });
    return raw;
  });
  await page.addInitScript(raw => localStorage.setItem('permanentData', JSON.stringify({ 'neon-covenant-saves-v2': { slots: { 2: raw }, activeSlot: 2 } })), original);
  await page.reload();
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(2);
  const state = await labState(page);
  expect(state.lab.cash).toBe(137);
  expect(state.lab.debt).toBe(94);
  expect(state.lab.employees).toHaveLength(6);
  expect(state.world.day).toBe(8);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'].migrationBackups[2])).toBe(original);
  await tap(page, 'x');
  await selectPersonnelRow(page, 'page:saves');
  await selectPersonnelRow(page, 'page:reset');
  await selectPersonnelRow(page, 'reset');
  await expect.poll(async () => (await labState(page))?.lab?.cash).toBe(180);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'].migrationBackups[2])).toBeUndefined();
});

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
  expect((await labState(page)).lab.cash).toBe(170);
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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const toy = page.locator('#NEON1');
  await toy.scrollIntoViewIfNeeded();
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

for (const migrated of [false, true]) {
test(`a ${migrated ? 'mid-campaign migrated' : 'new-save'} director can deliver Atlas and finish independently through real controller menus`, async ({ page }) => {
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
  await act(['x']);
  await choose('page:orientation');
  await choose('lesson:decline');
  await choose('lesson:cooling');
  await act(['x']);
  for (let shift = 0; shift < 6; shift++) {
    await act(['x']); await choose('page:ledger'); await choose('shift'); await act(['x']);
  }
  await act(['x']); await choose('page:research'); await choose('evaluate');
  await act(['x']); await choose('page:research');
  let state = await choose('deploy');
  expect(state.lab.deployed).toEqual(['atlas']);
  if (migrated) {
    const historical = structuredClone(state);
    historical.lab.rulesVersion = 1;
    delete historical.lab.incidentChains;
    delete historical.lab.incidentGrace;
    delete historical.lab.lastIncidentCost;
    const serialized = JSON.stringify({ game: 'neon-covenant', version: 2, slot: 0, state: historical });
    await page.evaluate(serialized => (window as any).labTools.get('neon_import_save').execute({ save: serialized }), serialized);
    state = JSON.parse(await page.evaluate(() => (window as any).labTools.get('neon_observe').execute().content[0].text)).state;
    expect(state.lab.rulesVersion).toBe(2);
    expect(state.lab.incidentGrace).toBe(2);
    for (const field of ['cash', 'debt', 'research', 'evaluated', 'deployed', 'contracts', 'incidents', 'employees']) {
      expect(state.lab[field]).toEqual(historical.lab[field]);
    }
    expect(state.world.day).toBe(historical.world.day);
  }
  for (let shift = 6; shift < 28; shift++) {
    await act(['x']); await choose('page:ledger'); state = await choose('shift');
    if (!state.lab.outcome) await act(['x']);
  }
  expect(state.lab.outcome).toBe('independent');
  expect(state.lab.cash).toBeGreaterThanOrEqual(state.lab.debt);
  expect(state.dialogue.actorId).toBe('resolution');
});
}
