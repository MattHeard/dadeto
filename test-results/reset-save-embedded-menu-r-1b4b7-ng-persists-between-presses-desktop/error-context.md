# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reset-save.spec.ts >> embedded menu reset preserves other slots and slot switching persists between presses
- Location: test/mosslight-e2e/reset-save.spec.ts:66:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  locator('#MOSS1').getByRole('button', { name: 'Submit', exact: true })
Expected: enabled
Received: disabled
Timeout:  5000ms

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for locator('#MOSS1').getByRole('button', { name: 'Submit', exact: true })
    13 × locator resolved to <button disabled type="submit">Submit</button>
       - unexpected value "disabled"

```

```yaml
- button "Submit" [disabled]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | import { controllerUtility, chooseControllerEntry, pauseController, pressController, readControllerState } from './controller';
  3  | 
  4  | async function readSaves(page: any) {
  5  |   return page.evaluate(() => JSON.parse(localStorage.getItem('permanentData') || '{}'));
  6  | }
  7  | 
  8  | async function seedProgress(page: any) {
  9  |   await page.goto('/mosslight-valley/');
  10 |   await pauseController(page);
  11 |   await expect(page.locator('#game-status')).toContainText('Paused');
  12 |   await page.evaluate(async () => {
  13 |     const base = '/core/browser/game/mosslight-valley/';
  14 |     const { createSimulation } = await import(`${base}simulation.js`);
  15 |     const { serializeSave } = await import(`${base}save.js`);
  16 |     const state = createSimulation();
  17 |     state.world.day = 5;
  18 |     state.world.player.x = 11;
  19 |     state.world.flags = { wellOpen: true, memoryCount: 3 };
  20 |     state.world.relationships.mira = 8;
  21 |     state.inventory = { dreamFragment: 9 };
  22 |     state.farm = { crop: 'moonTurnip', plantedDay: 1, wateredDay: 5 };
  23 |     state.journal = ['dreamFragment'];
  24 |     const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
  25 |     data.resetSentinel = 'keep me';
  26 |     data['mosslight-valley-saves-v2'] = { slots: { '0': serializeSave(state, 0), '1': serializeSave(state, 1) } };
  27 |     localStorage.setItem('permanentData', JSON.stringify(data));
  28 |   });
  29 | }
  30 | 
  31 | async function expectFresh(page: any, slot: string) {
  32 |   const data = await readSaves(page);
  33 |   const saved = JSON.parse(data['mosslight-valley-saves-v2'].slots[slot]);
  34 |   expect(saved.slot).toBe(Number(slot));
  35 |   expect(saved.state.world.player.x).toBe(6);
  36 |   expect(saved.state.world.day).toBe(1);
  37 |   expect(saved.state.world.flags).toEqual({});
  38 |   expect(saved.state.world.relationships.mira).toBe(0);
  39 |   expect(saved.state.inventory).toEqual({ moonSeed: 1, hearthTea: 1 });
  40 |   expect(saved.state.farm).toEqual({ crop: null, plantedDay: null, wateredDay: null });
  41 |   expect(saved.state.journal).toEqual([]);
  42 |   expect(saved.state.dialogue).toBeNull();
  43 |   expect(saved.state.battle).toBeNull();
  44 |   expect(saved.state.ending).toBeNull();
  45 |   expect(data.resetSentinel).toBe('keep me');
  46 | }
  47 | 
  48 | test('standalone menu reset cancels safely, resets only slot 02 and survives reload', async ({ page }) => {
  49 |   test.setTimeout(90_000);
  50 |   await seedProgress(page);
  51 |   await page.reload();
  52 |   await controllerUtility(page, 'slot:1');
  53 |   const before = await readSaves(page);
  54 |   await controllerUtility(page, 'page:reset');
  55 |   await chooseControllerEntry(page, 'page:main');
  56 |   expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  57 |   await controllerUtility(page, 'page:reset');
  58 |   await chooseControllerEntry(page, 'reset');
  59 |   await expectFresh(page, '1');
  60 |   expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['0']).toBe(before['mosslight-valley-saves-v2'].slots['0']);
  61 |   await page.reload();
  62 |   expect((await readSaves(page))['mosslight-valley-saves-v2'].activeSlot).toBe(1);
  63 |   await expectFresh(page, '1');
  64 | });
  65 | 
  66 | test('embedded menu reset preserves other slots and slot switching persists between presses', async ({ page }) => {
  67 |   test.setTimeout(90_000);
  68 |   await seedProgress(page);
  69 |   await page.goto('/');
  70 |   const toy = page.locator('#MOSS1');
> 71 |   await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
     |                                                                          ^ Error: expect(locator).toBeEnabled() failed
  72 |   const before = await readSaves(page);
  73 |   await controllerUtility(page, 'page:reset', true);
  74 |   await chooseControllerEntry(page, 'page:main', true);
  75 |   expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  76 |   await controllerUtility(page, 'page:reset', true);
  77 |   await chooseControllerEntry(page, 'reset', true);
  78 |   await expectFresh(page, '0');
  79 |   expect((await readSaves(page))['mosslight-valley-saves-v2'].slots['1']).toBe(before['mosslight-valley-saves-v2'].slots['1']);
  80 |   await pressController(page, 'right', true);
  81 |   expect((await readControllerState(page)).world.player.x).toBe(7);
  82 |   await controllerUtility(page, 'slot:1', true);
  83 |   await pressController(page, 'x', true);
  84 |   expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  85 |   expect((await readSaves(page))['mosslight-valley-saves-v2'].activeSlot).toBe(1);
  86 |   await page.reload();
  87 |   await pressController(page, 'x', true);
  88 |   expect((await readControllerState(page)).world.flags.memoryCount).toBe(3);
  89 |   expect((await readSaves(page)).resetSentinel).toBe('keep me');
  90 | });
  91 | 
```