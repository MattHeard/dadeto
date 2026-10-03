import { expect, test } from '@playwright/test';
import { controllerUtility, pauseController, pressController } from './controller';

test('all toys offer input/output swapping and the game remains playable after swapping', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.toy-swap-toggle')).toHaveCount(
    await page.locator('article select.input').count()
  );
  const toy = page.locator('#MOSS1');
  const swap = toy.getByRole('button', { name: 'Swap input/output' });
  const keypad = toy.locator('.mosslight-keypad');
  await keypad.getByRole('button', { name: 'Right' }).click();
  const input = toy.locator('select.input');
  const output = toy.locator('select.output');
  await swap.click();
  await expect(swap).toHaveAttribute('aria-pressed', 'true');
  const outputTop = (await output.boundingBox())!.y;
  expect(outputTop).toBeLessThan((await input.boundingBox())!.y);
  await keypad.getByRole('button', { name: 'Right' }).click();
  await expect.poll(() => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const save = data['mosslight-valley-saves-v2']?.slots?.['0'];
    return save ? JSON.parse(save).state.world.player.x : null;
  })).toBe(8);
  await swap.click();
  await expect(swap).toHaveAttribute('aria-pressed', 'false');
  expect((await output.boundingBox())!.y).toBeGreaterThan((await swap.boundingBox())!.y);
});

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
  await expect(page.getByRole('button', { name: 'B button: assigned action or back' })).toBeVisible();

  const dimensionsBefore = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensionsBefore.document).toBeLessThanOrEqual(
    dimensionsBefore.viewport
  );

  await page.locator('[data-action="right"]').tap();
  await page.waitForTimeout(300);
  await controllerUtility(page, 'save');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const envelope = saved['mosslight-valley-saves-v2'].slots['0'];
  expect(JSON.parse(envelope).state.world.player.x).toBe(7);
  await page.locator('[data-action="up"]').tap();
  await page.waitForTimeout(180);
  for (let index = 0; index < 3; index += 1) {
    await page.locator('[data-action="a"]').tap();
    await page.waitForTimeout(180);
  }
  await controllerUtility(page, 'save');
  const storySave = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const story = JSON.parse(
    storySave['mosslight-valley-saves-v2'].slots['0']
  ).state;
  expect(story.world.flags.miraTrust).toBe(1);
  expect(story.world.relationships.mira).toBe(1);
  await pauseController(page);
  await expect(page.locator('#game-status')).toContainText('Paused');
  await pressController(page, 'x');
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
  await expect(keypad.getByRole('button', { name: 'B · assigned action or back' })).toBeVisible();

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
  await controllerUtility(page, 'save');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('permanentData') || '{}')
  );
  const envelope = saved['mosslight-valley-saves-v2'].slots['0'];
  expect(JSON.parse(envelope).state.world.player.x).toBeGreaterThan(6);
});
