import { expect, test } from '@playwright/test';

function commonsState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const raw = data['the-commons-of-tomorrow-saves-v1']?.slots?.['0'];
    return raw ? JSON.parse(raw).state : null;
  });
}

test('dedicated Commons page runs the shared 160x144 controller runtime', async ({
  page,
}) => {
  await page.goto('/the-commons-of-tomorrow/');
  await expect(
    page.getByRole('heading', { name: 'The Commons of Tomorrow' })
  ).toBeVisible();
  await expect(page.locator('#game-screen')).toHaveAttribute('width', '160');
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => (await commonsState(page))?.world.player.x)
    .toBe(7);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBe(true);
});

test('embedded COMM1 toy uses the independent save namespace and keypad', async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    'The embedded handheld keypad is the mobile interaction path.'
  );
  await page.goto('/');
  const toy = page.locator('#COMM1');
  await toy.scrollIntoViewIfNeeded();
  await expect(toy.locator('select.input')).toHaveValue('mosslight-keypad');
  await toy.locator('.mosslight-keypad button[data-key="ArrowRight"]').click();
  await expect
    .poll(async () => (await commonsState(page))?.world.player.x)
    .toBe(7);
  await expect(toy.locator('canvas')).toHaveAttribute('width', '160');
});
