import { expect, test } from '@playwright/test';

test('phone layout fits the viewport and thumb input advances the shared save', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Phone-specific layout and touch interaction.');
  await page.goto('/mosslight-valley/');
  await expect(
    page.getByRole('heading', { name: 'Mosslight Valley' })
  ).toBeVisible();
  await expect(page.locator('#game-screen')).toBeVisible();
  await expect(page.locator('[data-action="right"]')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'A button: talk or confirm' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'B button: guard' })).toBeVisible();

  const dimensionsBefore = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensionsBefore.document).toBeLessThanOrEqual(
    dimensionsBefore.viewport
  );

  await page.locator('[data-action="right"]').tap();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Save', exact: true }).tap();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const envelope = saved['mosslight-valley-saves-v2'].slots['0'];
  expect(JSON.parse(envelope).state.world.player.x).toBe(7);
  await page.locator('[data-action="up"]').tap();
  await page.waitForTimeout(180);
  for (let index = 0; index < 3; index += 1) {
    await page.locator('[data-action="interact"]').tap();
    await page.waitForTimeout(180);
  }
  await page.getByRole('button', { name: 'Save', exact: true }).tap();
  const storySave = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const story = JSON.parse(
    storySave['mosslight-valley-saves-v2'].slots['0']
  ).state;
  expect(story.world.flags.miraTrust).toBe(1);
  expect(story.world.relationships.mira).toBe(1);
  await page.getByRole('button', { name: 'Pause' }).tap();
  await expect(page.locator('#game-status')).toContainText('Paused');
  await page.getByRole('button', { name: 'Resume' }).tap();
  await expect(page.locator('#game-status')).not.toContainText('Paused');
});

test('embedded opening preview defaults to the virtual keypad on phones', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The embedded keypad is specifically the phone input.');
  await page.goto('/');
  const toy = page.locator('#MOSS1');
  await toy.scrollIntoViewIfNeeded();
  await expect(toy.locator('select.input')).toHaveValue('mosslight-keypad');
  const keypad = toy.locator('.mosslight-keypad');
  await expect(keypad).toBeVisible();
  await expect(keypad.getByRole('button', { name: 'A · talk or confirm' })).toBeVisible();
  await expect(keypad.getByRole('button', { name: 'B · cancel' })).toBeVisible();

  await keypad.getByRole('button', { name: 'Right' }).tap();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const permanent = JSON.parse(localStorage.getItem('permanentData') || '{}');
        const serialized = permanent['mosslight-valley-saves-v2']?.slots?.['0'];
        return serialized ? JSON.parse(serialized).state.world.player.x : null;
      })
    )
    .toBe(7);
  const inputWidth = await keypad.evaluate(element =>
    Math.ceil(element.getBoundingClientRect().right)
  );
  expect(inputWidth).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  );
});

test('desktop page renders its handheld screen and accepts keyboard input', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop keyboard interaction.');
  await page.goto('/mosslight-valley/');
  await expect(page.locator('#game-screen')).toBeVisible();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const envelope = saved['mosslight-valley-saves-v2'].slots['0'];
  expect(JSON.parse(envelope).state.world.player.x).toBeGreaterThan(6);
});
