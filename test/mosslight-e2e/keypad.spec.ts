import { expect, test } from '@playwright/test';

test('keypad fills its form with handheld control placement', async ({ page }) => {
  await page.goto('/');
  const keypad = page.locator('#MOSS1 .mosslight-keypad');
  await expect(keypad).toBeVisible();
  const layout = await keypad.evaluate(element => {
    const box = element.getBoundingClientRect();
    const form = element.parentElement!.getBoundingClientRect();
    const dpad = element.querySelector('.mosslight-keypad-dpad')!.getBoundingClientRect();
    const face = element.querySelector('.mosslight-keypad-face')!.getBoundingClientRect();
    const system = element.querySelector('.mosslight-keypad-system')!.getBoundingClientRect();
    return {
      width: box.width, formWidth: form.width,
      dpadRight: dpad.right, faceLeft: face.left,
      systemTop: system.top, controlsBottom: Math.max(dpad.bottom, face.bottom),
    };
  });
  expect(Math.abs(layout.width - layout.formWidth)).toBeLessThan(1);
  expect(layout.faceLeft).toBeGreaterThan(layout.dpadRight);
  expect(layout.systemTop).toBeGreaterThan(layout.controlsBottom);
});
