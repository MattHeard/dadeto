import { expect, test, Page } from '@playwright/test';

async function savedState(page: Page) {
  return page.evaluate(() => {
    const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')[
      'neon-covenant-saves-v2'
    ];
    const slot = saves?.slots?.[saves.activeSlot ?? 0];
    return slot ? JSON.parse(slot).state : null;
  });
}

async function press(page: Page, button: string, embedded: boolean) {
  const key =
    ({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } as Record<string, string>)[button] || button;
  if (embedded) {
    await page.locator(`#NEON1 [data-key="${key}"]`).click();
  } else if (test.info().project.name === 'phone') {
    await page.locator(`[data-action="${button}"]`).tap();
  } else await page.keyboard.press(key, { delay: 60 });
  await page.waitForTimeout(280);
}

async function choose(page: Page, command: string, embedded: boolean) {
  const data = await page.evaluate(async target => {
    const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')[
      'neon-covenant-saves-v2'
    ];
    const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
    const { labEntries } = await import('/core/browser/game/neon-covenant/controls.js');
    const entries = labEntries(state);
    return {
      current: state.menu.selected,
      target: entries.findIndex((entry: string[]) => entry[1] === target),
      count: entries.length,
    };
  }, command);
  expect(data.target).toBeGreaterThanOrEqual(0);
  const forward = (data.target - data.current + data.count) % data.count;
  const backward = (data.current - data.target + data.count) % data.count;
  const direction = forward <= backward ? 'down' : 'up';
  for (let i = 0; i < Math.min(forward, backward); i++)
    await press(page, direction, embedded);
  await press(page, 'a', embedded);
}

for (const embedded of [false, true]) {
  test(`draft undo and settlement cutoff in ${embedded ? 'embedded' : 'standalone'} game`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(embedded ? '/' : '/neon-covenant/', { waitUntil: 'domcontentloaded' });
    if (embedded) {
      await page.locator('#NEON1').scrollIntoViewIfNeeded();
      await expect(page.locator('#NEON1').getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
    }
    await press(page, 'b', embedded);
    await expect.poll(async () => (await savedState(page))?.lab?.rulesVersion).toBe(11);
    await press(page, 'x', embedded);
    await choose(page, 'page:recruitment', embedded);
    await choose(page, 'page:employee:ada', embedded);
    await choose(page, 'assign:ada:service', embedded);
    expect((await savedState(page)).lab.employees[0].role).toBe('service');
    expect((await savedState(page)).lab.planning.orders).toHaveLength(1);
    await press(page, 'x', embedded);
    await choose(page, 'page:planning', embedded);
    await choose(page, 'plan:undo', embedded);
    expect((await savedState(page)).lab.employees[0].role).toBe('research');
    expect((await savedState(page)).lab.decisions).toBe(6);
    expect((await savedState(page)).lab.planning.orders).toEqual([]);
    await press(page, 'b', embedded);
    await choose(page, 'page:recruitment', embedded);
    await choose(page, 'page:employee:ada', embedded);
    await choose(page, 'assign:ada:service', embedded);
    await press(page, 'x', embedded);
    await choose(page, 'page:ledger', embedded);
    await choose(page, 'shift', embedded);
    const committed = await savedState(page);
    expect(committed.world.day).toBe(2);
    expect(committed.lab.employees[0].role).toBe('service');
    expect(committed.lab.planning.orders).toEqual([]);
    const valid = await page.evaluate(async () => {
      const saves = JSON.parse(localStorage.getItem('permanentData') || '{}')['neon-covenant-saves-v2'];
      const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
      const { validLabSave } = await import('/core/browser/game/neon-covenant/neonCovenant.js');
      return validLabSave(state);
    });
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });
}
