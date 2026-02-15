import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

const entry = page.locator('#container > .entry').first();
await entry.screenshot({ path: 'e2e-results/local-no-gap.png' });

// Measure spacing between bio and links sections
const bioKey = entry.locator('.key:has-text("bio")');
const linksEntry = page.locator('#container > .entry').nth(1);
const linksKey = linksEntry.locator('.key:has-text("links")');

const bioBox = await bioKey.boundingBox();
const linksBox = await linksKey.boundingBox();

const spacingBetweenSections = linksBox.y - (bioBox.y + 24); // 24px is approximate line height

console.log('\n=== SECTION SPACING ===');
console.log(`Bio key y: ${bioBox.y}`);
console.log(`Links key y: ${linksBox.y}`);
console.log(`Spacing between sections: ${spacingBetweenSections} pixels`);

if (spacingBetweenSections < 5) {
  console.log('✓ Sections are directly adjacent (no gap)');
} else {
  console.log('✗ There is still spacing between sections');
}

await browser.close();
