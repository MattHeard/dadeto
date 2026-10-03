# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eight-buttons.spec.ts >> embedded keypad uses the same eight-button assignment rules
- Location: test/mosslight-e2e/eight-buttons.spec.ts:67:1

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
  2  | import { controllerUtility, readControllerState } from './controller';
  3  | 
  4  | test('save export and import are accessible through the eight-button menu', async ({ page }) => {
  5  |   test.setTimeout(90_000);
  6  |   await page.goto('/mosslight-valley/');
  7  |   const downloadEvent = page.waitForEvent('download');
  8  |   await controllerUtility(page, 'export');
  9  |   expect((await downloadEvent).suggestedFilename()).toBe('mosslight-valley-save.json');
  10 |   const portable = await page.evaluate(async () => {
  11 |     const { serializeSave } = await import('/core/browser/game/mosslight-valley/save.js');
  12 |     const saves = JSON.parse(localStorage.getItem('permanentData')!)['mosslight-valley-saves-v2'];
  13 |     const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
  14 |     state.quickAction = 'rest';
  15 |     state.menu = null;
  16 |     return serializeSave(state);
  17 |   });
  18 |   const chooserEvent = page.waitForEvent('filechooser');
  19 |   await controllerUtility(page, 'import');
  20 |   await (await chooserEvent).setFiles({ name: 'mosslight.json', mimeType: 'application/json', buffer: Buffer.from(portable) });
  21 |   await expect.poll(async () => (await readControllerState(page))?.quickAction).toBe('rest');
  22 | });
  23 | 
  24 | async function state(page) {
  25 |   return page.evaluate(() => {
  26 |     const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
  27 |     const raw = data['mosslight-valley-saves-v2']?.slots?.['0'];
  28 |     return raw ? JSON.parse(raw).state : null;
  29 |   });
  30 | }
  31 | 
  32 | test('real handheld taps assign B and journal closes without hidden dialogue focus', async ({ page }) => {
  33 |   test.setTimeout(90_000);
  34 |   await page.goto('/mosslight-valley/');
  35 |   const controls = page.locator('[data-action]');
  36 |   expect(await controls.count()).toBe(8);
  37 |   expect(await controls.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-action')).sort())).toEqual(['a', 'b', 'down', 'left', 'right', 'up', 'x', 'y']);
  38 |   const press = async (action: string) => {
  39 |     const button = page.locator(`[data-action="${action}"]`);
  40 |     if (test.info().project.name === 'phone') await button.tap();
  41 |     else { await page.keyboard.down(action === 'down' ? 'ArrowDown' : action); }
  42 |     await page.waitForTimeout(300);
  43 |     if (test.info().project.name !== 'phone') { await page.keyboard.up(action === 'down' ? 'ArrowDown' : action); await page.waitForTimeout(150); }
  44 |   };
  45 |   await press('y');
  46 |   await expect.poll(async () => (await state(page))?.menu?.page).toBe('assign');
  47 |   await press('down'); await press('down'); await press('a');
  48 |   await expect.poll(async () => (await state(page))?.quickAction).toBe('wait');
  49 |   const before = await state(page);
  50 |   await press('b');
  51 |   await expect.poll(async () => (await state(page))?.world.time).toBe(before.world.time + 1);
  52 |   await press('x'); await press('down'); await press('down'); await press('a');
  53 |   await expect.poll(async () => (await state(page))?.menu?.page).toBe('journal');
  54 |   await page.screenshot({ path: `.tmp/mosslight-eight-journal-${test.info().project.name}.png` });
  55 |   await press('x');
  56 |   await expect.poll(async () => (await state(page))?.menu).toBeNull();
  57 |   await press('x'); await press('down'); await press('down'); await press('down'); await press('a');
  58 |   await expect.poll(async () => (await state(page))?.dialogue?.actorId).toBe('guide');
  59 |   await press('a');
  60 |   await expect.poll(async () => (await state(page))?.dialogue?.index).toBe(1);
  61 |   await press('b');
  62 |   await expect.poll(async () => (await state(page))?.dialogue).toBeNull();
  63 |   await expect(page.getByRole('button', { name: 'START', exact: true })).toHaveCount(0);
  64 |   await expect(page.getByRole('button', { name: 'SELECT', exact: true })).toHaveCount(0);
  65 | });
  66 | 
  67 | test('embedded keypad uses the same eight-button assignment rules', async ({ page }) => {
  68 |   await page.goto('/');
  69 |   const toy = page.locator('#MOSS1');
> 70 |   await expect(toy.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
     |                                                                          ^ Error: expect(locator).toBeEnabled() failed
  71 |   const press = async (key: string) => {
  72 |     await toy.locator(`button[data-key="${key}"]`).click();
  73 |     await page.waitForTimeout(150);
  74 |   };
  75 |   await press('y'); await press('ArrowDown'); await press('ArrowDown'); await press('a');
  76 |   await expect.poll(async () => (await state(page))?.quickAction).toBe('wait');
  77 |   const before = await state(page);
  78 |   await press('b');
  79 |   await expect.poll(async () => (await state(page))?.world.time).toBe(before.world.time + 1);
  80 |   await expect(toy.locator('button[data-key]')).toHaveCount(8);
  81 | });
  82 | 
```