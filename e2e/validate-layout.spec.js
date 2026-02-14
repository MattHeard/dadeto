import { test, expect } from '@playwright/test';

test('validate mattheard.net layout', async ({ page }) => {
  await page.goto('https://mattheard.net', { waitUntil: 'networkidle' });

  console.log('\n=== LAYOUT VALIDATION ===\n');

  // Check bio key-value pair exists
  const bioKey = page.locator('.key:has-text("bio")').first();
  await expect(bioKey).toBeVisible();
  const bioKeyText = await bioKey.textContent();
  console.log(`✓ Bio key text: "${bioKeyText}"`);

  // Get the bio value
  const bioValue = await bioKey.evaluate((el) => {
    const nextSibling = el.nextElementSibling;
    return nextSibling?.textContent?.trim();
  });
  console.log(`✓ Bio value text: "${bioValue}"`);

  // Verify correct structure
  expect(bioKeyText).toBe('bio');
  expect(bioValue).toContain('Software developer and philosopher in Berlin');

  // Check navbar filters
  const filters = await page.locator('.filter-button').all();
  console.log(`✓ Navigation filters found: ${filters.length}`);
  expect(filters.length).toBeGreaterThan(0);

  const filterTexts = [];
  for (const filter of filters) {
    const text = await filter.textContent();
    filterTexts.push(text);
  }
  console.log(`  Filters: ${filterTexts.join(', ')}`);

  // Check links section
  const linksKey = page.locator('.key:has-text("links")').first();
  await expect(linksKey).toBeVisible();
  console.log(`✓ Links section visible`);

  // Check articles exist
  const articles = page.locator('article.entry');
  const articleCount = await articles.count();
  console.log(`✓ Articles found: ${articleCount}`);
  expect(articleCount).toBeGreaterThan(0);

  // Verify first article structure
  if (articleCount > 0) {
    const firstArticle = articles.first();
    const title = firstArticle.locator('h2');
    const pubAt = firstArticle.locator('.key:has-text("pubAt")');
    
    await expect(title).toBeVisible();
    await expect(pubAt).toBeVisible();
    console.log(`✓ First article has proper structure`);
  }

  // Take screenshot
  await page.screenshot({ path: 'e2e-results/mattheard-validation.png', fullPage: true });
  console.log(`\n✓ Screenshot saved: e2e-results/mattheard-validation.png`);

  console.log('\n=== ALL VALIDATIONS PASSED ===\n');
});
