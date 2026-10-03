import { expect, Page } from '@playwright/test';

export async function readControllerState(page: Page, slot?: number) {
  return page.evaluate(slot => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const saves = data['mosslight-valley-saves-v2'];
    const raw = saves?.slots?.[slot ?? saves.activeSlot ?? 0];
    return raw ? JSON.parse(raw).state : null;
  }, slot);
}

export async function pressController(page: Page, action: string, embedded = false) {
  const key = ({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' })[action] || action;
  if (embedded) await page.locator(`#MOSS1 button[data-key="${key}"]`).click();
  else await page.keyboard.press(key, { delay: 150 });
  await page.waitForTimeout(160);
}

export async function openControllerMenu(page: Page, embedded = false) {
  let current = await readControllerState(page);
  if (current?.menu) { await pressController(page, 'x', embedded); }
  else if (current?.dialogue) { await pressController(page, 'x', embedded); }
  await pressController(page, 'x', embedded);
  await expect.poll(async () => (await readControllerState(page))?.menu?.page).toBe('main');
}

export async function chooseControllerEntry(page: Page, command: string, embedded = false) {
  const target = await page.evaluate(async command => {
    const { menuEntries } = await import('/core/browser/game/mosslight-valley/controls.js');
    const data = JSON.parse(localStorage.getItem('permanentData')!);
    const saves = data['mosslight-valley-saves-v2'];
    const state = JSON.parse(saves.slots[saves.activeSlot ?? 0]).state;
    return { index: menuEntries(state).findIndex(entry => entry.command === command), selected: state.menu.selected || 0 };
  }, command);
  expect(target.index).toBeGreaterThanOrEqual(0);
  for (let index = target.selected; index < target.index; index++) await pressController(page, 'down', embedded);
  for (let index = target.selected; index > target.index; index--) await pressController(page, 'up', embedded);
  await pressController(page, 'a', embedded);
}

export async function controllerUtility(page: Page, command: string, embedded = false) {
  await openControllerMenu(page, embedded);
  await chooseControllerEntry(page, 'page:saves', embedded);
  await chooseControllerEntry(page, command, embedded);
}

export async function pauseController(page: Page) {
  await openControllerMenu(page);
  await chooseControllerEntry(page, 'page:paused');
  await expect.poll(async () => (await readControllerState(page))?.menu?.page).toBe('paused');
}
