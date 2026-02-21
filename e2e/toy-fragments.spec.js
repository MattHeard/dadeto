import { test, expect } from '@playwright/test';

const TOYS = ['ANNO1', 'TEXT1', 'STAR1', 'TRAN1', 'GETD2', 'ADDD1', 'GERM2'];

for (const key of TOYS) {
  test(`Toy ${key} - article visible and elements load`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to the fragment URL
    await page.goto(`https://mattheard.net#${key}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the article with id=KEY to be present and visible
    const article = page.locator(`#${key}`);
    await expect(article).toBeVisible({ timeout: 15000 });
    console.log(`[${key}] Article is visible`);

    // Check for input elements (various types used in toys)
    const inputs = article.locator('input, textarea, select');
    const inputCount = await inputs.count();
    console.log(`[${key}] Input elements found: ${inputCount}`);

    // Check for output elements (typically a div/pre/span with output class or data-output)
    const outputs = article.locator('[data-output], .output, output');
    const outputCount = await outputs.count();
    console.log(`[${key}] Output elements found: ${outputCount}`);

    // Check for any buttons
    const buttons = article.locator('button');
    const buttonCount = await buttons.count();
    console.log(`[${key}] Buttons found: ${buttonCount}`);

    // Attempt basic interaction if there are inputs and buttons
    if (inputCount > 0 && buttonCount > 0) {
      const firstInput = inputs.first();
      const inputType = await firstInput.getAttribute('type');
      const tagName = await firstInput.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'textarea' || inputType === 'text' || inputType === null || inputType === 'number') {
        const currentValue = await firstInput.inputValue();
        if (!currentValue) {
          await firstInput.fill('test input');
          console.log(`[${key}] Filled text input with "test input"`);
        } else {
          console.log(`[${key}] Input already has value: "${currentValue}"`);
        }
      }

      const firstButton = buttons.first();
      const buttonText = await firstButton.textContent();
      await firstButton.click();
      console.log(`[${key}] Clicked button: "${buttonText?.trim()}"`);

      // Wait briefly for any async output
      await page.waitForTimeout(1000);
    } else if (inputCount > 0) {
      // Try triggering input event even without explicit button
      const firstInput = inputs.first();
      const tagName = await firstInput.evaluate(el => el.tagName.toLowerCase());
      const inputType = await firstInput.getAttribute('type');

      if (tagName === 'textarea' || inputType === 'text' || inputType === null) {
        await firstInput.fill('hello');
        await firstInput.dispatchEvent('input');
        console.log(`[${key}] Filled and triggered input event`);
        await page.waitForTimeout(500);
      }
    }

    // Final output check
    const finalOutputCount = await outputs.count();
    console.log(`[${key}] Final output element count: ${finalOutputCount}`);

    // Take a screenshot for reference
    await article.screenshot({ path: `/home/matt/dadeto/e2e-results/${key}.png` }).catch(() => {
      console.log(`[${key}] Could not take screenshot`);
    });

    // Assert article is still visible (not broken by interaction)
    await expect(article).toBeVisible();
    console.log(`[${key}] PASS`);
  });
}
