import { expect, test } from '@playwright/test';

test('embedded Start opens a readable guide that survives key release', async ({ page }) => {
  await page.goto('/');
  const toy = page.locator('#MOSS1');
  await toy.scrollIntoViewIfNeeded();
  await toy.locator('input[type="checkbox"]').check();
  await toy.getByRole('button', { name: 'Start · journal', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData') || '{}');
    const saved = data['mosslight-valley-saves-v2']?.slots?.['0'];
    return saved ? JSON.parse(saved).state.dialogue?.actorId : null;
  })).toBe('guide');
  await page.waitForTimeout(500);
  const guide = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('permanentData')!);
    return JSON.parse(data['mosslight-valley-saves-v2'].slots['0']).state.dialogue;
  });
  expect(guide.index).toBe(0);
  expect(guide.lines[0].text).toContain('Aster');
  await expect(toy.locator('canvas')).toBeVisible();
});
