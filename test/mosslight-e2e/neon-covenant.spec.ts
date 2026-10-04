import { expect, test, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

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
  else await page.keyboard.press(key, { delay: 60 });
  await page.waitForTimeout(280);
}

async function selectPersonnelRow(page: Page, command: string, embedded = false) {
  const selection = await page.evaluate(async command => {
    const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')['neon-covenant-saves-v2'];
    const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
    const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
    const entries = labEntries(state);
    return { current: state.menu.selected, target: entries.findIndex((row: string[]) => row[1] === command), count: entries.length };
  }, command);
  expect(selection.target).toBeGreaterThanOrEqual(0);
  const forward = (selection.target - selection.current + selection.count) % selection.count;
  const backward = (selection.current - selection.target + selection.count) % selection.count;
  const direction = forward <= backward ? 'down' : 'up';
  for (let index = 0; index < Math.min(forward, backward); index++) await tap(page, direction, embedded);
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
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(6);
  await tap(page, 'a', embedded);
  await selectPersonnelRow(page, 'page:forecast', embedded);
  return labState(page);
}

async function openSableCases(page: Page, embedded: boolean) {
  await page.goto(embedded ? '/' : '/neon-covenant/', { waitUntil: 'domcontentloaded' });
  if (embedded) {
    await page.locator('#NEON1').scrollIntoViewIfNeeded();
    await expect(page.locator('#NEON1').getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  }
  await tap(page, 'b', embedded);
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(6);
  await tap(page, 'a', embedded);
  await selectPersonnelRow(page, 'shift', embedded);
  await tap(page, 'b', embedded);
  await selectPersonnelRow(page, 'page:research', embedded);
  await selectPersonnelRow(page, 'page:tests', embedded);
  await selectPersonnelRow(page, 'page:testcase:reliability', embedded);
  return labState(page);
}

for (const embedded of [false, true]) {
  test(`earned authorship protections have real costs in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    await page.goto('/neon-covenant/');
    const raw = await page.evaluate(async () => {
      const { createNeonState, stepNeon } = await import('/core/browser/game/neon-covenant/simulation.js');
      const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
      let state = createNeonState();
      const press = (button: string) => { state = stepNeon(stepNeon(state, []), [button]); };
      const choose = (command: string) => {
        const target = labEntries(state).findIndex((row: string[]) => row[1] === command);
        if (target < 0) throw new Error(`Missing authored controller row ${command}`);
        while (state.menu.selected !== target) press('down');
        press('a');
      };
      press('b'); press('x'); choose('page:relationships'); choose('page:relationship:ada'); choose('promise:ada');
      for (let shift = 0; shift < 2; shift++) {
        press(shift === 0 ? 'x' : 'b'); choose('page:ledger'); choose('shift');
      }
      press('b'); choose('page:relationships'); choose('page:relationship:ada');
      state = stepNeon(state, []);
      return JSON.stringify({game: 'neon-covenant', version: 2, state});
    });
    await page.addInitScript(raw => localStorage.setItem('permanentData', JSON.stringify({'neon-covenant-saves-v2': {activeSlot: 0, slots: {0: raw}}})), raw);
    await page.goto(embedded ? '/' : '/neon-covenant/');
    if (embedded) {
      await page.locator('#NEON1').scrollIntoViewIfNeeded();
      await expect(page.locator('#NEON1').getByRole('button', {name: 'Submit', exact: true})).toBeEnabled();
    }
    const earned = await labState(page);
    expect(earned.lab.relationships.ada.fulfillments).toBe(1);
    await selectPersonnelRow(page, 'arc:protect:ada', embedded);
    const changed = await labState(page);
    expect(changed.lab.cash).toBe(earned.lab.cash - 8);
    expect(changed.lab.decisions).toBe(5);
    expect(changed.lab.commitmentPolicies.attribution).toBe(true);
    expect(changed.menu.page).toBe('relationship:ada');
    const pixels = await page.evaluate(selector => document.querySelector<HTMLCanvasElement>(selector)!.toDataURL('image/png'), embedded ? '#NEON1 canvas' : '#game-screen');
    await writeFile(`.tmp/neon-relationship-policy-${test.info().project.name}-${embedded ? 'embedded' : 'standalone'}.png`, Buffer.from(pixels.split(',')[1], 'base64'));
  });
  test(`personal story inspection is free and cancellable in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    await page.goto(embedded ? '/' : '/neon-covenant/');
    if (embedded) {
      await page.locator('#NEON1').scrollIntoViewIfNeeded();
      await expect(page.locator('#NEON1').getByRole('button', {name: 'Submit', exact: true})).toBeEnabled();
    }
    await tap(page, 'b', embedded);
    await tap(page, 'x', embedded);
    await selectPersonnelRow(page, 'page:relationships', embedded);
    await selectPersonnelRow(page, 'page:relationship:ada', embedded);
    const original = await labState(page);
    await selectPersonnelRow(page, 'arc-story:ada', embedded);
    expect((await labState(page)).dialogue.actorId).toBe('ada');
    await tap(page, 'a', embedded);
    await tap(page, 'a', embedded);
    expect((await labState(page)).lab).toEqual(original.lab);
    expect((await labState(page)).world.day).toBe(1);
    await tap(page, 'b', embedded);
    expect((await labState(page)).dialogue).toBeNull();
  });
  test(`personal commitments earn trust through actual shifts in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(embedded ? '/' : '/neon-covenant/');
    if (embedded) {
      await page.locator('#NEON1').scrollIntoViewIfNeeded();
      await expect(page.locator('#NEON1').getByRole('button', {name: 'Submit', exact: true})).toBeEnabled();
    }
    await tap(page, 'b', embedded);
    await tap(page, 'x', embedded);
    await selectPersonnelRow(page, 'page:relationships', embedded);
    await selectPersonnelRow(page, 'page:relationship:ada', embedded);
    const original = await labState(page);
    expect(original.lab.rulesVersion).toBe(6);
    await selectPersonnelRow(page, 'promise:ada', embedded);
    const accepted = await labState(page);
    expect(accepted.lab.relationships.ada.stage).toBe('active');
    expect(accepted.lab.relationships.ada.fulfillments).toBe(0);
    expect(accepted.lab.morale).toBe(original.lab.morale);
    expect(accepted.lab.decisions).toBe(5);
    for (let shift = 0; shift < 2; shift++) {
      await tap(page, shift === 0 ? 'x' : 'b', embedded);
      await selectPersonnelRow(page, 'page:ledger', embedded);
      await selectPersonnelRow(page, 'shift', embedded);
    }
    const earned = await labState(page);
    expect(earned.world.day).toBe(3);
    expect(earned.lab.relationships.ada).toMatchObject({stage: 'fulfilled', score: 8, fulfillments: 1});
    await page.screenshot({path: `.tmp/neon-relationships-${test.info().project.name}-${embedded ? 'embedded' : 'standalone'}.png`});
    await page.reload();
    await expect.poll(async () => (await labState(page))?.lab?.relationships?.ada?.stage).toBe('fulfilled');
    expect((await labState(page)).lab.relationships.ada.events.map((event: any) => event.type)).toContain('fulfilled');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const embedded of [false, true]) {
  test(`tactical evaluation rejects a premature patch without spending in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await openSableCases(page, embedded);
    await selectPersonnelRow(page, 'test:probe:reliability', embedded);
    const finding = (await labState(page)).lab;
    expect(finding.evaluations.atlas.reliability.status).toBe('finding');
    await selectPersonnelRow(page, 'test:fix:reliability', embedded);
    const state = await labState(page);
    expect(state.lab).toEqual(finding);
    expect(state.world.day).toBe(before.world.day);
    expect(state.toast).toContain('Investigate a current finding');
    expect(errors).toEqual([]);
  });

  test(`tactical evaluation case inspection is free and modal in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await openSableCases(page, embedded);
    await selectPersonnelRow(page, 'case:reliability', embedded);
    const state = await labState(page);
    expect(state.lab).toEqual(before.lab);
    expect(state.world.day).toBe(before.world.day);
    expect(state.menu).toBeNull();
    expect(state.dialogue.actorId).toBe('sable');
    const text = state.dialogue.lines.map((line: any) => line.text).join(' ');
    expect(text).toContain('feverish child');
    expect(text).toContain('Known unpatched result: finding');
    expect(text).toContain('Probe 2k/2 capacity');
    expect(await page.evaluate(async () => {
      const saves = JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'];
      const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
      const { wrapDialogueText } = await import('/core/browser/game/mosslight-valley/renderer.js');
      return state.dialogue.lines.every((line: any) => wrapDialogueText(line.text, 140).length <= 6);
    })).toBe(true);
    await page.screenshot({ path: `.tmp/neon-evaluation-case-${embedded ? 'embedded' : 'standalone'}-${test.info().project.name}.png` });
    await tap(page, 'b', embedded);
    expect((await labState(page)).dialogue).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`tactical evaluation finding requires investigation repair and fresh capacity in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await openSableCases(page, embedded);
    await selectPersonnelRow(page, 'test:probe:reliability', embedded);
    let state = await labState(page);
    expect(state.lab.evaluations.atlas.reliability.status).toBe('finding');
    expect(state.menu.page).toBe('testcase:reliability');
    await selectPersonnelRow(page, 'test:investigate:reliability', embedded);
    expect((await labState(page)).lab.evaluations.atlas.reliability.status).toBe('investigated');
    await selectPersonnelRow(page, 'test:fix:reliability', embedded);
    state = await labState(page);
    expect(state.lab.evaluations.atlas.reliability.status).toBe('retest');
    expect(state.lab.testingBudget).toBe(0);
    expect(state.presentation.menuRows[1]).toContain('TEST 0/6');
    expect(state.presentation.menuRows[3]).toContain('› Read case');
    expect(state.lab.decisions).toBe(before.lab.decisions - 3);
    expect(state.lab.cash).toBe(before.lab.cash - 8);
    const repaired = state.lab;
    await selectPersonnelRow(page, 'test:probe:reliability', embedded);
    state = await labState(page);
    expect(state.lab).toEqual(repaired);
    expect(state.toast).toContain('testing capacity');
    expect(state.lab.evaluated.atlas).toBe(0);
    expect(state.lab.deployed).toEqual([]);
    expect(state.world.day).toBe(before.world.day);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `.tmp/neon-evaluation-finding-${embedded ? 'embedded' : 'standalone'}-${test.info().project.name}.png` });
  });
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
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(6);
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

async function openProgramSetting(page: Page, embedded: boolean) {
  await openForecast(page, embedded);
  await tap(page, 'b', embedded);
  await selectPersonnelRow(page, 'page:research', embedded);
  await selectPersonnelRow(page, 'page:program', embedded);
  await selectPersonnelRow(page, 'page:setting:hosting', embedded);
  return labState(page);
}

for (const embedded of [false, true]) {
  test(`program configuration inspection is free and cancellable in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const original = await openProgramSetting(page, embedded);
    await selectPersonnelRow(page, 'setting:hosting:district', embedded);
    const preview = await labState(page);
    expect(preview.lab).toEqual(original.lab);
    expect(preview.world.day).toBe(original.world.day);
    const text = preview.dialogue.lines.map((line: any) => line.text).join(' ');
    expect(text).toContain('6k each shift');
    expect(text).toContain('Cost 10k and 1 attention');
    expect(text).toContain('Closing cash changes');
    expect(await page.evaluate(async () => {
      const root = JSON.parse(localStorage.getItem('permanentData')!)['neon-covenant-saves-v2'];
      const state = JSON.parse(root.slots[root.activeSlot ?? 0]).state;
      const { wrapDialogueText } = await import('/core/browser/game/mosslight-valley/renderer.js');
      return state.dialogue.lines.every((line: any) => wrapDialogueText(line.text).length <= 6);
    })).toBe(true);
    await tap(page, 'b', embedded);
    expect((await labState(page)).dialogue).toBeNull();
    expect((await labState(page)).lab).toEqual(original.lab);
    expect(errors).toEqual([]);
  });

  test(`program configuration confirmation settles its disclosed costs in ${embedded ? 'embedded' : 'standalone'} mode`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const original = await openProgramSetting(page, embedded);
    await selectPersonnelRow(page, 'setting:hosting:district', embedded);
    for (let index = 0; index < 30 && !(await labState(page)).dialogue.choices.length; index++) await tap(page, 'a', embedded);
    const confirmation = await labState(page);
    expect(confirmation.dialogue.choices).toHaveLength(2);
    expect(confirmation.lab).toEqual(original.lab);
    await page.screenshot({ path: `.tmp/neon-program-confirm-${test.info().project.name}-${embedded ? 'embedded' : 'standalone'}.png` });
    await tap(page, 'a', embedded);
    const paid = await labState(page);
    expect(paid.lab.cash).toBe(original.lab.cash - 10);
    expect(paid.lab.decisions).toBe(5);
    expect(paid.lab.programs.atlas.settings.hosting).toBe('district');
    expect(paid.lab.programs.lumen).toEqual(original.lab.programs.lumen);
    expect(paid.presentation.forecast.hosting).toBe(6);
    expect(paid.world.day).toBe(1);
    await tap(page, 'x', embedded);
    await selectPersonnelRow(page, 'page:ledger', embedded);
    await selectPersonnelRow(page, 'shift', embedded);
    const settled = await labState(page);
    expect(settled.lab.cash).toBe(paid.presentation.forecast.closingCash);
    expect(settled.lab.programs.atlas.milestones).toEqual(['prototype']);
    expect(settled.lab.report.join(' ')).toContain('hosting 6k');
    expect(settled.world.day).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('legacy mobile and desktop saves migrate losslessly and preserve a resettable backup', async ({ page }) => {
  await page.goto('/neon-covenant/');
  const original = await page.evaluate(async () => {
    const { createNeonState } = await import('/core/browser/game/neon-covenant/simulation.js');
    const state = createNeonState();
    delete state.lab.rulesVersion;
    delete state.lab.programs;
    delete state.lab.employees;
    Object.assign(state.lab, { cash: 137, debt: 94, hired: 6, teams: { research: 0, safety: 0, service: 6 }, promises: ['ada'] });
    state.world.day = 8;
    state.dialogue = null;
    const raw = JSON.stringify({ game: 'neon-covenant', version: 2, slot: 2, state });
    return raw;
  });
  await page.addInitScript(raw => localStorage.setItem('permanentData', JSON.stringify({ 'neon-covenant-saves-v2': { slots: { 2: raw }, activeSlot: 2 } })), original);
  await page.reload();
  await expect.poll(async () => (await labState(page))?.lab?.rulesVersion).toBe(6);
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

for (const embedded of [false, true]) {
test(`operating clients and paid maintenance work through the ${embedded ? 'embedded' : 'standalone'} keypad`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/neon-covenant/');
  const serialized = await page.evaluate(async () => {
    const { createNeonState, stepNeon } = await import('/core/browser/game/neon-covenant/simulation.js');
    const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
    const press = (state: any, button: string) => stepNeon(stepNeon(state, []), [button]);
    const choose = (state: any, command: string) => {
      const index = labEntries(state).findIndex((entry: string[]) => entry[1] === command);
      if (index < 0) throw Error(`Missing controller command ${command}`);
      while (state.menu.selected !== index) state = press(state, 'down');
      return press(state, 'a');
    };
    let state = choose(press(press(createNeonState(), 'b'), 'x'), 'page:orientation');
    state = choose(choose(state, 'lesson:decline'), 'lesson:cooling');
    state = press(state, 'x');
    for (let shift = 0; shift < 6; shift++) {
      state = choose(press(state, 'x'), 'page:ledger');
      state = press(choose(state, 'shift'), 'x');
    }
    state = choose(choose(press(state, 'x'), 'page:research'), 'page:tests');
    for (const id of ['reliability', 'rights', 'oversight']) {
      state = choose(state, `page:testcase:${id}`);
      state = choose(choose(state, `test:probe:${id}`), 'page:tests');
    }
    state = choose(choose(press(state, 'b'), 'page:research'), 'deploy');
    for (let shift = 0; shift < 10; shift++) {
      state = choose(press(state, 'x'), 'page:ledger');
      state = press(choose(state, 'shift'), 'x');
    }
    return JSON.stringify({ game: 'neon-covenant', version: 2, slot: 0, state: stepNeon(state, []) });
  });
  await page.addInitScript(serialized => {
    localStorage.setItem('permanentData', JSON.stringify({
      'neon-covenant-saves-v2': { activeSlot: 0, slots: [serialized] },
    }));
  }, serialized);
  await page.goto(embedded ? '/' : '/neon-covenant/');
  if (embedded) {
    await page.locator('#NEON1').scrollIntoViewIfNeeded();
    await expect(page.locator('#NEON1').getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  }
  await tap(page, 'x', embedded);
  await selectPersonnelRow(page, 'page:operations', embedded);
  await selectPersonnelRow(page, 'page:deployment:atlas', embedded);
  const before = await labState(page);
  expect(before.lab.deployments.atlas).toEqual({ adoption: 100, maintenance: 63, backlog: 0 });
  await selectPersonnelRow(page, 'operations-story', embedded);
  expect((await labState(page)).lab).toEqual(before.lab);
  await tap(page, 'b', embedded);
  await tap(page, 'x', embedded);
  await selectPersonnelRow(page, 'page:operations', embedded);
  await selectPersonnelRow(page, 'page:deployment:atlas', embedded);
  await selectPersonnelRow(page, 'service:maintain:atlas', embedded);
  const maintained = await labState(page);
  expect(maintained.lab.cash).toBe(before.lab.cash - 6);
  expect(maintained.lab.decisions).toBe(before.lab.decisions - 1);
  expect(maintained.lab.deployments.atlas.maintenance).toBe(100);
  expect(maintained.world.day).toBe(before.world.day);
  await selectPersonnelRow(page, 'service:triage:atlas', embedded);
  expect((await labState(page)).lab).toEqual(maintained.lab);
  const rows = await page.evaluate(async () => {
    const { labMenuRows } = await import('/core/browser/game/neon-covenant/controls.js');
    const storage = JSON.parse(localStorage.getItem('permanentData')!);
    const saves = storage['neon-covenant-saves-v2'];
    return labMenuRows(JSON.parse(saves.slots[saves.activeSlot ?? 0]).state);
  });
  expect(rows).toHaveLength(7);
  expect(rows.every((row: string) => row.length <= 30)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/neon-operations-${embedded ? 'embedded' : 'standalone'}-${test.info().project.name}.png` });
  expect(errors).toEqual([]);
});
}

for (const profile of ['new-save', 'mid-campaign migrated', 'district-hosted']) {
test(`a ${profile} director can deliver Atlas and finish independently through real controller menus`, async ({ page }) => {
  const migrated = profile === 'mid-campaign migrated';
  const district = profile === 'district-hosted';
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
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
  await choose(district ? 'lesson:clinic' : 'lesson:decline');
  await choose(district ? 'lesson:decline' : 'lesson:cooling');
  await act(['x']);
  if (district) {
    await act(['x']);
    await choose('page:research');
    await choose('page:program');
    await choose('page:setting:hosting');
    let proposal = await choose('setting:hosting:district');
    for (let pageIndex = 0; pageIndex < 30 && !proposal.dialogue.choices.length; pageIndex++) proposal = await act(['a']);
    expect(proposal.dialogue.choices).toHaveLength(2);
    const configured = await act(['a']);
    expect(configured.lab.programs.atlas.settings.hosting).toBe('district');
    expect(configured.lab.cooling).toBe(4);
  }
  for (let shift = 0; shift < 6; shift++) {
    await act(['x']); await choose('page:ledger'); await choose('shift'); await act(['x']);
  }
  await act(['x']); await choose('page:research'); await choose('page:tests');
  for (const id of ['reliability', 'rights', 'oversight']) {
    await choose(`page:testcase:${id}`); await choose(`test:probe:${id}`); await choose('page:tests');
  }
  await act(['b']); await choose('page:research');
  let state = await choose('deploy');
  expect(state.lab.deployed).toEqual(['atlas']);
  if (migrated) {
    const historical = structuredClone(state);
    historical.lab.rulesVersion = 1;
    delete historical.lab.programs;
    delete historical.lab.deployments;
    delete historical.lab.evaluations;
    delete historical.lab.testingBudget;
    delete historical.lab.incidentChains;
    delete historical.lab.incidentGrace;
    delete historical.lab.lastIncidentCost;
    const serialized = JSON.stringify({ game: 'neon-covenant', version: 2, slot: 0, state: historical });
    await page.evaluate(serialized => (window as any).labTools.get('neon_import_save').execute({ save: serialized }), serialized);
    state = JSON.parse(await page.evaluate(() => (window as any).labTools.get('neon_observe').execute().content[0].text)).state;
    expect(state.lab.rulesVersion).toBe(6);
    expect(state.lab.incidentGrace).toBe(2);
    for (const field of ['cash', 'debt', 'research', 'evaluated', 'deployed', 'contracts', 'incidents', 'employees']) {
      expect(state.lab[field]).toEqual(historical.lab[field]);
    }
    expect(state.world.day).toBe(historical.world.day);
  }
  for (let shift = 6; shift < 28; shift++) {
    await act(['x']);
    if (state.lab.deployments.atlas.maintenance <= 64) {
      await choose('page:operations'); await choose('page:deployment:atlas');
      const before = state.lab.cash;
      state = await choose('service:maintain:atlas');
      expect(state.lab.cash).toBe(before - 6);
      expect(state.lab.deployments.atlas.maintenance).toBe(100);
      await act(['b']);
    }
    await choose('page:ledger'); state = await choose('shift');
    if (!state.lab.outcome) await act(['x']);
  }
  expect(state.lab.outcome).toBe('independent');
  expect(state.lab.cash).toBeGreaterThanOrEqual(state.lab.debt);
  expect(state.dialogue.actorId).toBe('resolution');
  expect(errors).toEqual([]);
  if (!district) expect(state.lab.cash).toBe(migrated ? 164 : 135);
  if (district) {
    expect(state.lab.fulfilled).toEqual(['clinic']);
    expect(state.lab.cash).toBe(175);
    expect(state.lab.incidents).toBe(0);
    expect(state.lab.programs.atlas.milestones).toEqual(['prototype', 'pilot', 'release']);
  }
});
}
