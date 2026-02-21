import { test, expect } from '@playwright/test';

const TOYS = ['ANNO1', 'TEXT1', 'STAR1', 'TRAN1', 'GETD2', 'ADDD1', 'GERM2'];

for (const key of TOYS) {
  test(`Toy ${key} - article visible and elements load`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`https://mattheard.net#${key}`, { waitUntil: 'networkidle', timeout: 30000 });

    const article = page.locator(`#${key}`);
    await expect(article).toBeVisible({ timeout: 15000 });
    console.log(`[${key}] Article is visible`);

    // Use a single JS evaluation to inspect and interact with all inputs
    const interactionLog = await article.evaluate((articleEl) => {
      const log = [];
      const allInputs = Array.from(articleEl.querySelectorAll('input, textarea, select'));
      log.push(`Total inputs: ${allInputs.length}`);

      for (let i = 0; i < allInputs.length; i++) {
        const el = allInputs[i];
        const tag = el.tagName.toLowerCase();
        const type = el.type || 'n/a';
        const cls = el.className || 'n/a';
        // Check visibility via offsetParent and computed style
        const style = window.getComputedStyle(el);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;

        log.push(`input[${i}]: tag=${tag} type=${type} class=${cls} visible=${visible}`);

        if (!visible) continue;

        if (tag === 'select') {
          if (el.options.length > 1) {
            el.selectedIndex = 1;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            log.push(`  -> selected option 1 of ${el.options.length}`);
          }
        } else if (tag === 'textarea' || type === 'text' || type === 'n/a' || type === '') {
          el.value = 'test input';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          log.push(`  -> filled with "test input"`);
        } else if (type === 'number') {
          el.value = '42';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          log.push(`  -> filled number with 42`);
        } else {
          log.push(`  -> skipped (type=${type})`);
        }
      }

      return log;
    });

    for (const line of interactionLog) {
      console.log(`[${key}] ${line}`);
    }

    // Check output elements
    const outputs = article.locator('[data-output], .output, output');
    const outputCount = await outputs.count();
    console.log(`[${key}] Output elements: ${outputCount}`);

    // Click first button
    const buttons = article.locator('button');
    const buttonCount = await buttons.count();
    console.log(`[${key}] Buttons: ${buttonCount}`);

    if (buttonCount > 0) {
      const firstBtn = buttons.first();
      const btnText = await firstBtn.textContent();
      await firstBtn.click();
      console.log(`[${key}] Clicked: "${btnText?.trim()}"`);
      await page.waitForTimeout(1000);
    }

    // Report output content
    for (let i = 0; i < outputCount; i++) {
      const text = await outputs.nth(i).textContent();
      console.log(`[${key}]   output[${i}]: "${text?.trim().substring(0, 100)}"`);
    }

    // Screenshot
    try {
      await article.screenshot({ path: `/home/matt/dadeto/e2e-results/${key}.png` });
      console.log(`[${key}] Screenshot saved`);
    } catch (e) {
      console.log(`[${key}] Screenshot error: ${e.message}`);
    }

    await expect(article).toBeVisible();
    console.log(`[${key}] PASS`);
  });
}
